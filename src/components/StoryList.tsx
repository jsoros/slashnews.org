import React, { useEffect, useCallback, useRef } from 'react';
import { hackerNewsApi, type HackerNewsItem } from '../services/hackerNewsApi';
import { useStoryData } from '../hooks/useStoryData';
import { useStoryListState } from '../hooks/useStoryListState';
import { StoryCard } from './StoryCard';
import { StoryErrorBoundary } from './ErrorBoundary';

type ViewMode = 'title' | 'compact' | 'full';

interface StoryListProps {
  category?: string;
  viewMode: ViewMode;
}

export const StoryList = React.memo<StoryListProps>(({ category = 'top', viewMode }) => {
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

  // Use the new reducer-based state management
  const { state, actions, computed } = useStoryListState();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Map<number, Element>>(new Map());


  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Clean up observed elements when category changes
  useEffect(() => {
    // Clear all observed elements and visible stories when category changes
    const observer = observerRef.current;
    const elements = observedElements.current;
    
    if (observer) {
      elements.forEach((element) => {
        observer.unobserve(element);
      });
    }
    elements.clear();
    actions.clearVisibleStories();
  }, [category, actions]);

  // Setup intersection observer to track visible stories
  useEffect(() => {
    const elements = observedElements.current;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const storyId = parseInt(entry.target.getAttribute('data-story-id') || '0');
          if (entry.isIntersecting) {
            actions.addVisibleStory(storyId);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading summaries when stories are 100px from viewport
        threshold: 0.1
      }
    );

    // Cleanup function to properly disconnect observer and clear references
    return () => {
      const observer = observerRef.current;
      
      if (observer) {
        observer.disconnect();
        observerRef.current = null;
      }
      elements.clear();
    };
  }, [actions]);

  const toggleComments = useCallback((storyId: number) => {
    actions.toggleStoryExpansion(storyId);
  }, [actions]);


  const loadSummary = useCallback(async (story: HackerNewsItem) => {
    if (!computed.shouldLoadSummary(story.id, !!story.url)) {
      return;
    }

    actions.startSummaryLoading(story.id);

    try {
      const summary = await hackerNewsApi.getArticleSummary(story.url!);
      if (summary) {
        actions.setSummarySuccess(story.id, summary);
      } else {
        actions.setSummaryFailed(story.id);
      }
    } catch {
      actions.setSummaryFailed(story.id);
    }
  }, [computed, actions]);

  // Load summaries only for visible stories with conservative rate limiting
  useEffect(() => {
    const loadSummariesForVisibleStories = async () => {
      const loadableStories = computed.getLoadableSummaries(
        stories.map(s => s.id), 
        (id: number) => {
          const story = stories.find(s => s.id === id);
          return !!(story?.url && !story.text);
        }
      );
      
      // Load summaries sequentially with delay to avoid rate limiting
      for (let i = 0; i < loadableStories.length; i++) {
        const storyId = loadableStories[i];
        const story = stories.find(s => s.id === storyId);
        if (story) {
          await loadSummary(story);
          
          // Delay between requests to avoid rate limiting (1 second)
          if (i < loadableStories.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    };

    if (state.visibleStories.size > 0 && stories.length > 0) {
      loadSummariesForVisibleStories();
    }
  }, [state.visibleStories, stories, computed, loadSummary]);

  // Observe stories when they're added to the DOM with proper cleanup
  const storyRef = useCallback((node: HTMLDivElement | null, storyId: number) => {
    // Clean up previous observation if element is being replaced
    const previousElement = observedElements.current.get(storyId);
    if (previousElement && observerRef.current) {
      observerRef.current.unobserve(previousElement);
      observedElements.current.delete(storyId);
    }

    if (node && observerRef.current) {
      node.setAttribute('data-story-id', storyId.toString());
      observerRef.current.observe(node);
      observedElements.current.set(storyId, node);
    }
  }, []);

  if (loading) {
    return <div className="loading">Loading stories...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stories-container">
      {stories.map((story) => (
        <div key={story.id} ref={(node) => storyRef(node, story.id)}>
          <StoryErrorBoundary>
            <StoryCard
              story={story}
              viewMode={viewMode}
              expandedStory={state.expandedStory}
              summary={computed.getSummary(story.id)}
              loadingSummary={computed.isLoadingSummary(story.id)}
              summaryFailed={computed.isSummaryFailed(story.id)}
              onToggleComments={toggleComments}
            />
          </StoryErrorBoundary>
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
}, (prevProps, nextProps) => {
  return prevProps.category === nextProps.category &&
         prevProps.viewMode === nextProps.viewMode;
});