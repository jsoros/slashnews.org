import React, { useState, useEffect, useCallback } from 'react';
import { hackerNewsApi, type HackerNewsItem } from '../services/hackerNewsApi';
import { useStoryData } from '../hooks/useStoryData';
import { StoryCard } from './StoryCard';

type ViewMode = 'title' | 'compact' | 'full';

interface StoryListProps {
  category?: string;
  viewMode: ViewMode;
}

export const StoryList: React.FC<StoryListProps> = ({ category = 'top', viewMode }) => {
  const { 
    stories, 
    loading, 
    error, 
    loadStories, 
    loadMoreStories, 
    loadingMore, 
    hasMoreStories,
    storiesCount,
    totalCount 
  } = useStoryData(category);

  const [summaries, setSummaries] = useState<Map<number, string>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<number>>(new Set());
  const [failedSummaries, setFailedSummaries] = useState<Set<number>>(new Set());
  const [expandedStory, setExpandedStory] = useState<number | null>(null);


  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const toggleComments = (storyId: number) => {
    setExpandedStory(expandedStory === storyId ? null : storyId);
  };


  const loadSummary = useCallback(async (story: HackerNewsItem) => {
    if (!story.url || summaries.has(story.id) || loadingSummaries.has(story.id) || failedSummaries.has(story.id)) {
      return;
    }

    setLoadingSummaries(prev => new Set([...prev, story.id]));

    try {
      const summary = await hackerNewsApi.getArticleSummary(story.url);
      if (summary) {
        setSummaries(prev => new Map([...prev, [story.id, summary]]));
      } else {
        // Mark as failed if no summary returned
        setFailedSummaries(prev => new Set([...prev, story.id]));
      }
    } catch (error) {
      // Mark as failed on error
      setFailedSummaries(prev => new Set([...prev, story.id]));
    } finally {
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(story.id);
        return newSet;
      });
    }
  }, [summaries, loadingSummaries, failedSummaries]);

  // Auto-load summaries for URL-only stories with priority-based loading (top-to-bottom)
  // Only load for currently visible stories to reduce API load
  useEffect(() => {
    const loadSummariesForNewStories = async () => {
      const urlOnlyStories = stories.filter(story => 
        !story.text && 
        story.url && 
        !summaries.has(story.id) && 
        !loadingSummaries.has(story.id) && 
        !failedSummaries.has(story.id)
      );
      
      // Load summaries sequentially with increased delay to reduce rate limiting
      for (let i = 0; i < urlOnlyStories.length; i++) {
        const story = urlOnlyStories[i];
        await loadSummary(story);
        
        // Increased delay to avoid rate limiting (500ms between requests)
        if (i < urlOnlyStories.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    if (stories.length > 0) {
      loadSummariesForNewStories();
    }
  }, [stories, summaries, loadingSummaries, failedSummaries, loadSummary]);

  if (loading) {
    return <div className="loading">Loading stories...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stories-container">
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          viewMode={viewMode}
          expandedStory={expandedStory}
          summary={summaries.get(story.id)}
          loadingSummary={loadingSummaries.has(story.id)}
          summaryFailed={failedSummaries.has(story.id)}
          onToggleComments={toggleComments}
        />
      ))}
      
      {/* Load More Section */}
      {hasMoreStories && (
        <div className="load-more-section">
          <div className="story-count">
            Showing {storiesCount} of {totalCount} stories
          </div>
          <button 
            className="load-more-btn"
            onClick={loadMoreStories}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More Stories'}
          </button>
        </div>
      )}
    </div>
  );
};