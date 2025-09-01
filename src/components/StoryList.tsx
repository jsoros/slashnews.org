import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [visibleStories, setVisibleStories] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);


  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Setup intersection observer to track visible stories
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const storyId = parseInt(entry.target.getAttribute('data-story-id') || '0');
          if (entry.isIntersecting) {
            setVisibleStories(prev => new Set([...prev, storyId]));
          }
        });
      },
      {
        rootMargin: '100px', // Start loading summaries when stories are 100px from viewport
        threshold: 0.1
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

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
    } catch {
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

  // Load summaries only for visible stories with conservative rate limiting
  useEffect(() => {
    const loadSummariesForVisibleStories = async () => {
      const visibleUrlOnlyStories = stories
        .filter(story => 
          visibleStories.has(story.id) &&
          !story.text && 
          story.url && 
          !summaries.has(story.id) && 
          !loadingSummaries.has(story.id) && 
          !failedSummaries.has(story.id)
        );
      
      // Load summaries sequentially with delay to avoid rate limiting
      for (let i = 0; i < visibleUrlOnlyStories.length; i++) {
        const story = visibleUrlOnlyStories[i];
        await loadSummary(story);
        
        // Delay between requests to avoid rate limiting (1 second)
        if (i < visibleUrlOnlyStories.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    if (visibleStories.size > 0 && stories.length > 0) {
      loadSummariesForVisibleStories();
    }
  }, [visibleStories, stories, summaries, loadingSummaries, failedSummaries, loadSummary]);

  if (loading) {
    return <div className="loading">Loading stories...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Observe stories when they're added to the DOM
  const storyRef = useCallback((node: HTMLDivElement | null, storyId: number) => {
    if (node && observerRef.current) {
      node.setAttribute('data-story-id', storyId.toString());
      observerRef.current.observe(node);
    }
  }, []);

  return (
    <div className="stories-container">
      {stories.map((story) => (
        <div key={story.id} ref={(node) => storyRef(node, story.id)}>
          <StoryCard
            story={story}
            viewMode={viewMode}
            expandedStory={expandedStory}
            summary={summaries.get(story.id)}
            loadingSummary={loadingSummaries.has(story.id)}
            summaryFailed={failedSummaries.has(story.id)}
            onToggleComments={toggleComments}
          />
        </div>
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