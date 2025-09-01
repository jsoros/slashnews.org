import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import { hackerNewsApi, type HackerNewsItem } from '../services/hackerNewsApi';
import { Comments } from './Comments';

type ViewMode = 'title' | 'compact' | 'full';

interface StoryListProps {
  category?: string;
  viewMode: ViewMode;
}

export const StoryList: React.FC<StoryListProps> = ({ category = 'top', viewMode }) => {
  const [stories, setStories] = useState<HackerNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Map<number, string>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<number>>(new Set());
  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  
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

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const getStoryIcon = (story: HackerNewsItem): string => {
    if (!story.url) return '💬';
    
    const domain = new URL(story.url).hostname.toLowerCase();
    if (domain.includes('github')) return '👨‍💻';
    if (domain.includes('youtube') || domain.includes('youtu.be')) return '📺';
    if (domain.includes('twitter') || domain.includes('x.com')) return '🐦';
    if (domain.includes('medium')) return '📝';
    if (domain.includes('arxiv')) return '🔬';
    if (domain.includes('wikipedia')) return '📚';
    
    return '🌐';
  };

  const formatTimeAgo = (timestamp: number): string => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  const toggleComments = (storyId: number) => {
    setExpandedStory(expandedStory === storyId ? null : storyId);
  };


  const loadSummary = useCallback(async (story: HackerNewsItem) => {
    if (!story.url || summaries.has(story.id) || loadingSummaries.has(story.id)) {
      return;
    }

    setLoadingSummaries(prev => new Set([...prev, story.id]));

    try {
      const summary = await hackerNewsApi.getArticleSummary(story.url);
      if (summary) {
        setSummaries(prev => new Map([...prev, [story.id, summary]]));
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(story.id);
        return newSet;
      });
    }
  }, [summaries, loadingSummaries]);

  // Auto-load summaries for URL-only stories with priority-based loading (top-to-bottom)
  useEffect(() => {
    const loadSummariesSequentially = async () => {
      const urlOnlyStories = stories.filter(story => !story.text && story.url && !summaries.has(story.id) && !loadingSummaries.has(story.id));
      
      // Load summaries sequentially from top to bottom with a small delay between each
      for (let i = 0; i < urlOnlyStories.length; i++) {
        const story = urlOnlyStories[i];
        await loadSummary(story);
        
        // Add a small delay between requests to prevent overwhelming the API
        if (i < urlOnlyStories.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    };

    if (stories.length > 0) {
      loadSummariesSequentially();
    }
  }, [stories, summaries, loadingSummaries, loadSummary]);

  if (loading) {
    return <div className="loading">Loading stories...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stories-container">
      {stories.map((story) => (
        <div key={story.id} className={`story-wrapper view-${viewMode}`}>
          {/* Title View - Just title with minimal styling */}
          {viewMode === 'title' && (
            <div className="title-view">
              <h3 className="title-only">
                {story.url ? (
                  <a href={story.url} target="_blank" rel="noopener noreferrer">
                    {story.title}
                  </a>
                ) : (
                  <span>{story.title}</span>
                )}
              </h3>
            </div>
          )}

          {/* Compact View - Title + dense metadata underneath */}
          {viewMode === 'compact' && (
            <div className="compact-view">
              <h3 className="compact-title">
                {story.url ? (
                  <a href={story.url} target="_blank" rel="noopener noreferrer">
                    {story.title}
                  </a>
                ) : (
                  <span>{story.title}</span>
                )}
              </h3>
              <div className="compact-meta">
                <span className="compact-author">{story.by}</span>
                <span className="compact-separator">•</span>
                <span className="compact-time">{formatTimeAgo(story.time)}</span>
                {story.score && (
                  <>
                    <span className="compact-separator">•</span>
                    <span className="compact-points">{story.score} pts</span>
                  </>
                )}
                {story.descendants && (
                  <>
                    <span className="compact-separator">•</span>
                    <button 
                      className="compact-comments-btn"
                      onClick={() => toggleComments(story.id)}
                    >
                      {story.descendants} comments
                    </button>
                  </>
                )}
                {story.url && (
                  <>
                    <span className="compact-separator">•</span>
                    <span className="compact-domain">{new URL(story.url).hostname}</span>
                  </>
                )}
              </div>

              {/* Comments for Compact View */}
              {expandedStory === story.id && (
                <div className="compact-comments-section">
                  <Comments storyId={story.id} />
                </div>
              )}
            </div>
          )}

          {/* Full View - Current card layout */}
          {viewMode === 'full' && (
            <>
              <h2 className="story-title">
                {story.url ? (
                  <a href={story.url} target="_blank" rel="noopener noreferrer">
                    {story.title}
                  </a>
                ) : (
                  <span>{story.title}</span>
                )}
              </h2>

              <div className="story-card">
                <div className="story-card-header">
                  <div className="user-avatar">
                    <div className="avatar-placeholder">
                      {story.by ? story.by[0].toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div className="story-meta-header">
                    <div className="story-author">
                      <a href={`https://news.ycombinator.com/user?id=${story.by}`} target="_blank" rel="noopener noreferrer">
                        {story.by}
                      </a>
                    </div>
                    <div className="story-timestamp">
                      {formatTimeAgo(story.time)} • 
                      {story.url && (
                        <a href={story.url} target="_blank" rel="noopener noreferrer" className="story-source">
                          {new URL(story.url).hostname}
                        </a>
                      )}
                      {!story.url && <span className="story-source">HackerNews</span>}
                    </div>
                  </div>
                  <div className="story-type-icon">
                    {getStoryIcon(story)}
                  </div>
                </div>

                <div className="story-content">
                  {story.text && (
                    <div 
                      className="story-summary" 
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.text) }}
                    />
                  )}

                  {/* Show summary for URL-only stories */}
                  {!story.text && story.url && (
                    <div className="story-summary">
                      {summaries.has(story.id) ? (
                        <div className="auto-summary">
                          {summaries.get(story.id)}
                        </div>
                      ) : loadingSummaries.has(story.id) ? (
                        <div className="loading-summary">
                          <em>Loading summary...</em>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="story-footer">
                  <div className="story-stats">
                    {story.score && (
                      <span className="story-points">
                        {story.score} points
                      </span>
                    )}
                    {story.descendants && (
                      <button 
                        className="story-comments-btn"
                        onClick={() => toggleComments(story.id)}
                      >
                        {story.descendants} comments
                      </button>
                    )}
                  </div>
                  <div className="story-actions">
                    <a 
                      href={`https://news.ycombinator.com/item?id=${story.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="story-action-link"
                    >
                      View on HN
                    </a>
                  </div>
                </div>

                {/* Comments for Full View - Inside Card */}
                {expandedStory === story.id && (
                  <div className="full-comments-section">
                    <Comments storyId={story.id} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      
      {/* Load More Section */}
      {totalStoryIds.length > stories.length && (
        <div className="load-more-section">
          <div className="story-count">
            Showing {stories.length} of {totalStoryIds.length} stories
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