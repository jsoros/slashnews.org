import { useState, useCallback } from 'react';
import { hackerNewsApi, type HackerNewsItem } from '../services/hackerNewsApi';

export const useStoryData = (category: string) => {
  const [stories, setStories] = useState<HackerNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStoryIds, setTotalStoryIds] = useState<number[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const storiesPerPage = 30;

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let storyIds: number[] = [];
      
      switch (category) {
        case 'new':
          storyIds = await hackerNewsApi.getNewStories();
          break;
        case 'best':
          storyIds = await hackerNewsApi.getBestStories();
          break;
        default:
          storyIds = await hackerNewsApi.getTopStories();
      }
      
      // Store all story IDs and reset pagination
      setTotalStoryIds(storyIds);
      setCurrentPage(1);
      
      // Load first page
      const firstPageIds = storyIds.slice(0, storiesPerPage);
      const storiesData = await hackerNewsApi.getItems(firstPageIds);
      setStories(storiesData);
    } catch (err) {
      setError('Failed to load stories. Please try again later.');
      console.error('Error loading stories:', err);
    } finally {
      setLoading(false);
    }
  }, [category, storiesPerPage]);

  const loadMoreStories = useCallback(async () => {
    if (loadingMore || stories.length >= totalStoryIds.length) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * storiesPerPage;
      const endIndex = startIndex + storiesPerPage;
      
      const nextPageIds = totalStoryIds.slice(startIndex, endIndex);
      const newStoriesData = await hackerNewsApi.getItems(nextPageIds);
      
      setStories(prev => [...prev, ...newStoriesData]);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more stories:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, stories.length, totalStoryIds, currentPage, storiesPerPage]);

  return {
    stories,
    loading,
    error,
    loadStories,
    loadMoreStories,
    loadingMore,
    hasMoreStories: totalStoryIds.length > stories.length,
    storiesCount: stories.length,
    totalCount: totalStoryIds.length
  };
};