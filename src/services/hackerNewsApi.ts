import axios from 'axios';

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
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { 
        timeout: 5000, // Reduced timeout to fail faster
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
        }
      });
      
      const html = response.data.contents;
      if (html && html.length > 100) {
        return html;
      }
    } catch {
      // Silently fail - summary failures are not critical and shouldn't spam console
    }
    
    return null;
  }

  async getArticleSummary(url: string): Promise<string | null> {
    if (!this.isValidUrl(url)) {
      return null;
    }

    this.maintainCache();
    
    // Check cache first
    const cached = this.summaryCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return cached.data;
    }

    try {
      const html = await this.fetchHtmlContent(url);
      if (!html) {
        return null;
      }
      
      // Extract meta description or Open Graph description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
      
      const summary = descMatch?.[1] || ogMatch?.[1];
      
      // If no meta description found, return null instead of fallback
      if (!summary) {
        return null;
      }
      
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
      return cleanSummary;
      
    } catch {
      // Silently fail - summary failures are not critical and shouldn't spam console
      return null;
    }
  }
  async getTopStories(): Promise<number[]> {
    const response = await axios.get(`${BASE_URL}/topstories.json`);
    return response.data;
  }

  async getNewStories(): Promise<number[]> {
    const response = await axios.get(`${BASE_URL}/newstories.json`);
    return response.data;
  }

  async getBestStories(): Promise<number[]> {
    const response = await axios.get(`${BASE_URL}/beststories.json`);
    return response.data;
  }

  async getItem(id: number): Promise<HackerNewsItem | null> {
    try {
      const response = await axios.get(`${BASE_URL}/item/${id}.json`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
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
}

export const hackerNewsApi = new HackerNewsApi();