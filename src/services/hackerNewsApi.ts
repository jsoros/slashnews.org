import axios from 'axios';
import { measureAsync } from '../utils/performance';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export interface HackerNewsItem {
  id: number;
  deleted?: boolean;
  type: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
  by?: string;
  time: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

interface CacheEntry {
  data: string;
  timestamp: number;
}

class HackerNewsApi {
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_EXPIRY_MS = 3600000; // 1 hour
  private summaryCache = new Map<string, CacheEntry>();
  private readonly DEBUG_MODE = import.meta.env.MODE === 'development' ||
                                import.meta.env.VITE_DEBUG_SUMMARIES === 'true';

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }


  private maintainCache(): void {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.summaryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
        this.summaryCache.delete(key);
      }
    }

    // Remove oldest entries if cache is too large
    if (this.summaryCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.summaryCache.entries());
      entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2))
        .forEach(([key]) => this.summaryCache.delete(key));
    }
  }

  private async fetchHtmlContent(url: string): Promise<string | null> {
    const proxies = [
      {
        url: `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
        extractContent: (response: { data: string }) => response.data,
        name: 'api.cors.lol'
      },
      {
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        extractContent: (response: { data: { contents: string } }) => response.data.contents,
        name: 'allorigins.win'
      }
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxy = proxies[i];

        if (this.DEBUG_MODE) {
          console.log(`[Summary Debug] Trying proxy ${proxy.name} (${i + 1}/${proxies.length}) for ${url}`);
        }

        const html = await circuitBreakerRegistry.executeWithCircuitBreaker(
          `proxy-service-${proxy.name}`,
          async () => {
            const response = await axios.get(proxy.url, {
              timeout: 8000, // Longer timeout with circuit breaker protection
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
              }
            });
            return proxy.extractContent(response);
          },
          { maxRetries: 1, baseDelayMs: 1000 }
        );

        if (html && html.length > 100) {
          if (this.DEBUG_MODE) {
            console.log(`[Summary Debug] ✅ Success with ${proxy.name}, content length: ${html.length}`);
          }
          return html;
        } else if (this.DEBUG_MODE) {
          console.warn(`[Summary Debug] ⚠️ ${proxy.name} returned insufficient content: ${html?.length || 0} chars`);
        }
      } catch (error) {
        // Log which proxy failed, try next one
        const message = error instanceof Error ? error.message : String(error);
        if (this.DEBUG_MODE) {
          console.error(`[Summary Debug] ❌ Proxy ${proxies[i].name} (${i + 1}/${proxies.length}) failed for ${url}:`, message);
        } else {
          console.warn(`Proxy ${proxies[i].name} (${i + 1}/${proxies.length}) failed for ${url}:`, message);
        }
        continue;
      }
    }
    
    return null;
  }

  async getArticleSummary(url: string): Promise<string | null> {
    console.debug(`[Summary API] Starting getArticleSummary for: ${url}`);
    
    if (!this.isValidUrl(url)) {
      console.debug(`[Summary API] Invalid URL: ${url}`);
      return null;
    }

    this.maintainCache();
    
    // Check cache first
    const cached = this.summaryCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      console.debug(`[Summary API] Cache hit for: ${url}`);
      return cached.data;
    }

    try {
      console.debug(`[Summary API] Fetching HTML content for: ${url}`);
      const html = await measureAsync('HN-API-fetchHtmlContent', () => 
        this.fetchHtmlContent(url)
      );
      if (!html) {
        console.debug(`[Summary API] No HTML content returned for: ${url}`);
        return null;
      }
      
      console.debug(`[Summary API] HTML fetched (${html.length} chars), extracting summary for: ${url}`);
      
      // Extract meta description or Open Graph description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
      
      const summary = descMatch?.[1] || ogMatch?.[1];
      
      // If no meta description found, return null instead of fallback
      if (!summary) {
        console.debug(`[Summary API] No meta description found for: ${url}`);
        return null;
      }
      
      console.debug(`[Summary API] Found summary (${summary.length} chars) for: ${url}`);
      
      // Clean up HTML entities and limit length
      let cleanSummary = summary
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .substring(0, 300);
      
      if (cleanSummary.length === 300) cleanSummary += '...';
      
      // Cache the result with timestamp
      this.summaryCache.set(url, {
        data: cleanSummary,
        timestamp: Date.now()
      });
      console.debug(`[Summary API] Successfully cached summary for: ${url}`);
      return cleanSummary;
      
    } catch (error) {
      console.warn(`[Summary API] Failed to load summary for ${url}:`, error);
      return null;
    }
  }
  async getTopStories(): Promise<number[]> {
    return measureAsync('HN-API-getTopStories', async () => {
      return circuitBreakerRegistry.executeWithCircuitBreaker(
        'hacker-news-stories',
        async () => {
          const response = await axios.get(`${BASE_URL}/topstories.json`, { timeout: 10000 });
          return response.data;
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );
    });
  }

  async getNewStories(): Promise<number[]> {
    return measureAsync('HN-API-getNewStories', async () => {
      return circuitBreakerRegistry.executeWithCircuitBreaker(
        'hacker-news-stories',
        async () => {
          const response = await axios.get(`${BASE_URL}/newstories.json`, { timeout: 10000 });
          return response.data;
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );
    });
  }

  async getBestStories(): Promise<number[]> {
    return measureAsync('HN-API-getBestStories', async () => {
      return circuitBreakerRegistry.executeWithCircuitBreaker(
        'hacker-news-stories',
        async () => {
          const response = await axios.get(`${BASE_URL}/beststories.json`, { timeout: 10000 });
          return response.data;
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );
    });
  }

  async getItem(id: number): Promise<HackerNewsItem | null> {
    return measureAsync(`HN-API-getItem-${id}`, async () => {
      try {
        return await circuitBreakerRegistry.executeWithCircuitBreaker(
          'hacker-news-items',
          async () => {
            const response = await axios.get(`${BASE_URL}/item/${id}.json`, { timeout: 8000 });
            return response.data;
          },
          { maxRetries: 2, baseDelayMs: 500 }
        );
      } catch (error) {
        console.error(`Failed to fetch item ${id}:`, error);
        return null;
      }
    });
  }

  async getItems(ids: number[]): Promise<HackerNewsItem[]> {
    const promises = ids.map(id => this.getItem(id));
    const items = await Promise.all(promises);
    return items.filter(item => item !== null) as HackerNewsItem[];
  }

  async getStoriesWithDetails(count: number = 30): Promise<HackerNewsItem[]> {
    const storyIds = await this.getTopStories();
    const topStoryIds = storyIds.slice(0, count);
    return this.getItems(topStoryIds);
  }

  async getCommentsForStory(storyId: number): Promise<HackerNewsItem[]> {
    const story = await this.getItem(storyId);
    if (!story || !story.kids) return [];
    
    return this.getCommentsRecursive(story.kids);
  }

  private async getCommentsRecursive(commentIds: number[]): Promise<HackerNewsItem[]> {
    const comments: HackerNewsItem[] = [];
    
    for (const id of commentIds) {
      const comment = await this.getItem(id);
      if (comment && !comment.deleted && !comment.dead) {
        comments.push(comment);
        
        if (comment.kids && comment.kids.length > 0) {
          const childComments = await this.getCommentsRecursive(comment.kids);
          comments.push(...childComments);
        }
      }
    }
    
    return comments;
  }

  // Cleanup method for test environments
  clearCache(): void {
    this.summaryCache.clear();
  }
}

export const hackerNewsApi = new HackerNewsApi();