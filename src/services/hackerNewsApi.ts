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

class HackerNewsApi {
  private summaryCache = new Map<string, string>();

  async getArticleSummary(url: string): Promise<string | null> {
    // Check cache first
    if (this.summaryCache.has(url)) {
      return this.summaryCache.get(url)!;
    }

    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl);
      const html = response.data.contents;
      
      // Extract meta description or Open Graph description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
      
      let summary = descMatch?.[1] || ogMatch?.[1];
      
      // If no meta description found, try domain-based fallback
      if (!summary) {
        const domain = new URL(url).hostname.toLowerCase();
        if (domain.includes('github')) summary = 'GitHub repository or project';
        else if (domain.includes('arxiv')) summary = 'Academic paper or research article';
        else if (domain.includes('wikipedia')) summary = 'Wikipedia article';
        else if (domain.includes('medium')) summary = 'Medium article or blog post';
        else summary = 'External article';
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
      
      // Cache the result
      this.summaryCache.set(url, summary);
      return summary;
      
    } catch (error) {
      console.error(`Failed to fetch summary for ${url}:`, error);
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