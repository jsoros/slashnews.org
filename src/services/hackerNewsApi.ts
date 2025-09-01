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

  private getDomainBasedSummary(url: string): string {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      const path = new URL(url).pathname.toLowerCase();
      
      // Enhanced domain-specific summaries
      if (domain.includes('github.com')) {
        if (path.includes('/issues/')) return 'GitHub issue or discussion';
        if (path.includes('/pull/')) return 'GitHub pull request';
        if (path.includes('/releases/')) return 'GitHub software release';
        if (path.includes('/wiki/')) return 'GitHub project documentation';
        return 'GitHub repository or project';
      }
      
      if (domain.includes('arxiv.org')) return 'Academic research paper from arXiv';
      if (domain.includes('wikipedia.org')) return 'Wikipedia encyclopedia article';
      if (domain.includes('medium.com')) return 'Medium blog post or article';
      if (domain.includes('stackoverflow.com')) return 'Stack Overflow programming Q&A';
      if (domain.includes('reddit.com')) return 'Reddit discussion thread';
      if (domain.includes('twitter.com') || domain.includes('x.com')) return 'Twitter/X social media post';
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'YouTube video content';
      if (domain.includes('news.ycombinator.com')) return 'Hacker News discussion';
      if (domain.includes('techcrunch.com')) return 'TechCrunch technology news';
      if (domain.includes('arstechnica.com')) return 'Ars Technica technology article';
      if (domain.includes('wired.com')) return 'WIRED technology and culture article';
      if (domain.includes('theverge.com')) return 'The Verge technology news';
      if (domain.includes('bloomberg.com')) return 'Bloomberg business and financial news';
      if (domain.includes('reuters.com')) return 'Reuters news article';
      if (domain.includes('bbc.com') || domain.includes('bbc.co.uk')) return 'BBC news article';
      if (domain.includes('cnn.com')) return 'CNN news article';
      if (domain.includes('nytimes.com')) return 'New York Times news article';
      if (domain.includes('wsj.com')) return 'Wall Street Journal article';
      
      // Tech company blogs/announcements
      if (domain.includes('blog.google') || domain.includes('developers.googleblog.com')) return 'Google developer blog post';
      if (domain.includes('engineering.fb.com') || domain.includes('tech.facebook.com')) return 'Meta/Facebook engineering blog';
      if (domain.includes('netflixtechblog.com')) return 'Netflix technology blog';
      if (domain.includes('eng.uber.com')) return 'Uber engineering blog';
      if (domain.includes('blog.twitter.com')) return 'Twitter engineering blog';
      
      return 'External article or webpage';
    } catch {
      return 'External article';
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
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
        }
      });
      
      const html = response.data.contents;
      if (html && html.length > 100) {
        return html;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to fetch content for ${url}:`, error);
      }
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
        // Fall back to domain-based summary if no HTML retrieved
        return this.getDomainBasedSummary(url);
      }
      
      // Extract meta description or Open Graph description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
      
      let summary = descMatch?.[1] || ogMatch?.[1];
      
      // If no meta description found, try domain-based fallback
      if (!summary) {
        summary = this.getDomainBasedSummary(url);
      }
      
      // Clean up HTML entities and limit length
      summary = summary
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .substring(0, 300);
      
      if (summary.length === 300) summary += '...';
      
      // Cache the result with timestamp
      this.summaryCache.set(url, {
        data: summary,
        timestamp: Date.now()
      });
      return summary;
      
    } catch (error) {
      // Suppress console errors for summary failures in production (they're not critical)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Summary unavailable for ${url}:`, error);
      }
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