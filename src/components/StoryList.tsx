import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import type { HackerNewsItem } from '../services/hackerNewsApi';
import type { ViewMode, SortMode } from '../types/ui';
import { useStoryData } from '../hooks/useStoryData';
import { useStoryListState } from '../hooks/useStoryListState';
import { useHiddenArticles } from '../hooks/useHiddenArticles';
import { StoryCard } from './StoryCard';
import { StoryErrorBoundary } from './ErrorBoundary';
import { hackerNewsApi } from '../services/hackerNewsApi';
import type { CommentWithLevel } from './commentsUtils';

interface StoryListProps {
  category?: string;
  viewMode: ViewMode;
  sortMode: SortMode;
  showHiddenArticles?: boolean;
}

export const StoryList = React.memo<StoryListProps>(({ category = 'top', viewMode, sortMode, showHiddenArticles = false }) => {
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
  const { state, actions } = useStoryListState();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Map<number, Element>>(new Map());

  // Use state management for expanded story instead of local state
  const expandedStory = state.expandedStory;

  // Store state and actions in refs to avoid recreating callbacks
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);

  // Update refs on every render
  stateRef.current = state;
  actionsRef.current = actions;

  // Filter and sort articles based on hidden state, toggle, and sort mode
  const visibleStories = useMemo(() => {
    let filteredStories = stories;

    // Filter by hidden state
    if (!showHiddenArticles) {
      filteredStories = stories.filter(story => !isArticleHidden(story.id));
    }

    // Apply sorting
    if (sortMode === 'comments') {
      return [...filteredStories].sort((a, b) => {
        const aComments = a.descendants || 0;
        const bComments = b.descendants || 0;
        return bComments - aComments; // Sort by comment count descending
      });
    }

    return filteredStories; // Default order (as received from API)
  }, [stories, isArticleHidden, showHiddenArticles, sortMode]);


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
    actionsRef.current.clearAllState(); // Reset all state including expanded story on category change
  }, [category]); // Don't include actions - it recreates on every state change

  // Load summary function - stable callback using refs
  const loadSummary = useCallback(async (story: HackerNewsItem) => {
    if (!story.url) {
      console.debug(`[Summary] Skipping story ${story.id}: no URL`);
      return;
    }

    // Check if we should load this summary using refs
    const currentState = stateRef.current;
    if (currentState.summaries.has(story.id)) {
      console.debug(`[Summary] Story ${story.id} already has summary`);
      return;
    }
    if (currentState.loadingSummaries.has(story.id)) {
      console.debug(`[Summary] Story ${story.id} already loading`);
      return;
    }
    if (currentState.failedSummaries.has(story.id)) {
      console.debug(`[Summary] Story ${story.id} previously failed, skipping`);
      return;
    }

    console.debug(`[Summary] Starting load for story ${story.id}: ${story.url}`);
    actionsRef.current.startSummaryLoading(story.id);

    try {
      const summary = await hackerNewsApi.getArticleSummary(story.url);
      if (summary) {
        console.debug(`[Summary] Success for story ${story.id}: ${summary.substring(0, 50)}...`);
        actionsRef.current.setSummarySuccess(story.id, summary);
      } else {
        console.debug(`[Summary] No summary returned for story ${story.id}`);
        actionsRef.current.setSummaryFailed(story.id);
      }
    } catch (error) {
      console.warn(`[Summary] Failed to load summary for story ${story.id}:`, error);
      actionsRef.current.setSummaryFailed(story.id);
    }
  }, []);

  // Setup intersection observer to load summaries when stories become visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const storyId = parseInt(entry.target.getAttribute('data-story-id') || '', 10);
            const story = visibleStories.find(s => s.id === storyId);
            if (story) {
              loadSummary(story);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    observerRef.current = observer;

    // Observe all story elements
    observedElements.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [visibleStories, loadSummary]);

  const toggleComments = useCallback((storyId: number) => {
    actionsRef.current.toggleStoryExpansion(storyId);
  }, []); // No dependencies - use ref

  const retrySummary = useCallback((storyId: number) => {
    console.debug(`[Summary] Retry requested for story ${storyId}`);
    const story = visibleStories.find(s => s.id === storyId);
    if (!story) {
      console.warn(`[Summary] Story ${storyId} not found for retry`);
      return;
    }
    // Clear failed state before retrying
    actionsRef.current.clearSummaryFailed(storyId);
    loadSummary(story);
  }, [visibleStories, loadSummary]);

  // Pre-load comments for the first few visible stories in the background
  useEffect(() => {
    if (loading || !visibleStories.length) {
      return;
    }

    // Only pre-load comments for the first 3 stories with comment counts
    const storiesToPreload = visibleStories
      .slice(0, 3)
      .filter(story => story.descendants && story.descendants > 0);

    if (storiesToPreload.length === 0) {
      return;
    }

    // Delay pre-loading to avoid impacting initial page load
    const timeoutId = setTimeout(async () => {
      const { preloadComments } = await import('./commentsPreload.ts');

      const buildCommentTree = async (
        commentIds: number[],
        level: number
      ): Promise<CommentWithLevel[]> => {
        const comments: CommentWithLevel[] = [];
        for (const id of commentIds) {
          const comment = await hackerNewsApi.getItem(id);
          if (comment && !comment.deleted && !comment.dead && comment.text) {
            const commentWithLevel = { ...comment, level };
            comments.push(commentWithLevel);
            if (comment.kids && comment.kids.length > 0) {
              const childComments = await buildCommentTree(comment.kids, level + 1);
              comments.push(...childComments);
            }
          }
        }
        return comments;
      };

      // Pre-load comments for each story sequentially to avoid overload
      for (const story of storiesToPreload) {
        await preloadComments(story.id, buildCommentTree, hackerNewsApi);
        // Small delay between stories to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, 1000); // Wait 1 second after stories load before pre-loading

    return () => clearTimeout(timeoutId);
  }, [visibleStories, loading]);

  // Story ref callback for intersection observer
  const storyRef = useCallback((node: HTMLDivElement | null, storyId: number) => {
    if (node) {
      node.setAttribute('data-story-id', storyId.toString());
      observedElements.current.set(storyId, node);
      observerRef.current?.observe(node);
    } else {
      const element = observedElements.current.get(storyId);
      if (element) {
        observerRef.current?.unobserve(element);
        observedElements.current.delete(storyId);
      }
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
              summary={state.summaries.get(story.id)}
              loadingSummary={state.loadingSummaries.has(story.id)}
              summaryFailed={state.failedSummaries.has(story.id)}
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
         prevProps.sortMode === nextProps.sortMode &&
         prevProps.showHiddenArticles === nextProps.showHiddenArticles;
});