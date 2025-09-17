import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import type { HackerNewsItem } from '../services/hackerNewsApi';
import { useStoryData } from '../hooks/useStoryData';
import { useStoryListState } from '../hooks/useStoryListState';
import { useHiddenArticles } from '../hooks/useHiddenArticles';
import { StoryCard } from './StoryCard';
import { StoryErrorBoundary } from './ErrorBoundary';
import { hackerNewsApi } from '../services/hackerNewsApi';

type ViewMode = 'title' | 'compact' | 'full';

interface StoryListProps {
  category?: string;
  viewMode: ViewMode;
  showHiddenArticles?: boolean;
}

export const StoryList = React.memo<StoryListProps>(({ category = 'top', viewMode, showHiddenArticles = false }) => {
  const {
    stories,
    loading,
    error,
    loadStories,
    loadMoreStories,
    loadingMore,
    hasMoreStories,
    totalCount
  } = useStoryData(category);

  const { hideArticle, showArticle, isArticleHidden } = useHiddenArticles();

  // Restore complex state management for summary loading
  const { state, actions, computed } = useStoryListState();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Map<number, Element>>(new Map());

  // Use state management for expanded story instead of local state
  const expandedStory = state.expandedStory;

  // Filter articles based on hidden state and toggle
  const visibleStories = useMemo(() => {
    if (showHiddenArticles) {
      // Show all stories when toggle is on
      return stories;
    } else {
      // Filter out hidden articles when toggle is off
      return stories.filter(story => !isArticleHidden(story.id));
    }
  }, [stories, isArticleHidden, showHiddenArticles]);


  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Clean up observed elements when category changes
  useEffect(() => {
    // Clear all observed elements when category changes
    const observer = observerRef.current;
    const elements = observedElements.current;

    if (observer) {
      elements.forEach((element) => {
        observer.unobserve(element);
      });
    }
    elements.clear();
    actions.clearAllState(); // Reset all state including expanded story on category change
  }, [category, actions]);

  // TEMPORARILY DISABLED: Intersection observer causing maximum update depth errors
  // Setup intersection observer to track visible stories
  // useEffect(() => {
  //   // Intersection observer logic disabled temporarily
  //   return () => {
  //     // Cleanup
  //   };
  // }, [actions]);

  const toggleComments = useCallback((storyId: number) => {
    actions.toggleStoryExpansion(storyId);
  }, [actions]);

  const retrySummary = useCallback((storyId: number) => {
    // Reset the failed state and retry loading
    actions.startSummaryLoading(storyId);
    const story = visibleStories.find(s => s.id === storyId);
    if (story) {
      loadSummaryRef.current?.(story);
    }
  }, [actions, visibleStories]);


  // Load summary function with stable dependencies to prevent infinite loops
  const loadSummaryRef = useRef<(story: HackerNewsItem) => Promise<void>>(async () => {});

  loadSummaryRef.current = async (story: HackerNewsItem) => {
    if (!story.url) {
      return;
    }

    // Check if we should load this summary by accessing current state
    if (state.summaries.has(story.id) ||
        state.loadingSummaries.has(story.id) ||
        state.failedSummaries.has(story.id)) {
      return;
    }

    actions.startSummaryLoading(story.id);

    try {
      const summary = await hackerNewsApi.getArticleSummary(story.url);
      if (summary) {
        actions.setSummarySuccess(story.id, summary);
      } else {
        actions.setSummaryFailed(story.id);
      }
    } catch (error) {
      console.warn(`Failed to load summary for story ${story.id}:`, error);
      actions.setSummaryFailed(story.id);
    }
  };

  const loadSummary = useCallback((story: HackerNewsItem) => {
    loadSummaryRef.current?.(story);
  }, []);

  // Load summaries for visible stories with debouncing to prevent infinite loops
  useEffect(() => {
    if (loading || !visibleStories.length) {
      return;
    }

    const loadSummariesForVisible = async () => {
      // Get stories that need summaries loaded - limit to first 5 to prevent overload
      const storiesToLoad = visibleStories
        .slice(0, 5)
        .filter(story => Boolean(story.url));

      // Load summaries in parallel but with limited concurrency
      for (const story of storiesToLoad) {
        loadSummary(story);
      }
    };

    // Debounce summary loading to prevent rapid firing
    const timeoutId = setTimeout(async () => {
      try {
        await loadSummariesForVisible();
      } catch (error) {
        console.error('Error in loadSummariesForVisible:', error);
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [visibleStories, loading, loadSummary]);

  // TEMPORARILY DISABLED: Story ref callback for intersection observer
  const storyRef = useCallback((node: HTMLDivElement | null, storyId: number) => {
    // Disabled - intersection observer temporarily removed
    if (node) {
      node.setAttribute('data-story-id', storyId.toString());
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
      {visibleStories.map((story) => (
        <div key={story.id} ref={(node) => storyRef(node, story.id)}>
          <StoryErrorBoundary>
            <StoryCard
              story={story}
              viewMode={viewMode}
              expandedStory={expandedStory}
              summary={computed.getSummary(story.id)}
              loadingSummary={computed.isLoadingSummary(story.id)}
              summaryFailed={computed.isSummaryFailed(story.id)}
              onToggleComments={toggleComments}
              onHideArticle={hideArticle}
              onShowArticle={showArticle}
              onRetrySummary={retrySummary}
              isHidden={isArticleHidden(story.id)}
              showingHidden={showHiddenArticles}
            />
          </StoryErrorBoundary>
        </div>
      ))}

      {/* Load More Section */}
      {hasMoreStories && (
        <div className="load-more-section">
          <div className="story-count">
            Showing {visibleStories.length} of {totalCount} stories
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
         prevProps.viewMode === nextProps.viewMode &&
         prevProps.showHiddenArticles === nextProps.showHiddenArticles;
});