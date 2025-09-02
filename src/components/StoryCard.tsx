import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import { type HackerNewsItem } from '../services/hackerNewsApi';
import { Comments } from './Comments';
import { CommentsErrorBoundary } from './ErrorBoundary';

type ViewMode = 'title' | 'compact' | 'full';

interface StoryCardProps {
  story: HackerNewsItem;
  viewMode: ViewMode;
  expandedStory: number | null;
  summary?: string;
  loadingSummary?: boolean;
  summaryFailed?: boolean;
  onToggleComments: (storyId: number) => void;
}

const getStoryIcon = (story: HackerNewsItem): string => {
  if (!story.url) return '💬';
  
  try {
    const domain = new URL(story.url).hostname.toLowerCase();
    if (domain.includes('github')) return '👨‍💻';
    if (domain.includes('youtube') || domain.includes('youtu.be')) return '📺';
    if (domain.includes('twitter') || domain.includes('x.com')) return '🐦';
    if (domain.includes('medium')) return '📝';
    if (domain.includes('arxiv')) return '🔬';
    if (domain.includes('wikipedia')) return '📚';
    
    return '🌐';
  } catch {
    // Return generic icon for malformed URLs
    return '🌐';
  }
};

const formatTimeAgo = (timestamp: number): string => {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

export const StoryCard = React.memo<StoryCardProps>(({
  story,
  viewMode,
  expandedStory,
  summary,
  loadingSummary,
  summaryFailed,
  onToggleComments
}) => {
  return (
    <div className={`story-wrapper view-${viewMode}`}>
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
                  onClick={() => onToggleComments(story.id)}
                >
                  {story.descendants} comments
                </button>
              </>
            )}
          </div>

          {/* Summary for compact view */}
          {!story.text && story.url && (
            <div className="story-summary">
              {summary ? (
                <div className="auto-summary">{summary}</div>
              ) : loadingSummary ? (
                <div className="loading-summary">
                  <em>Loading summary...</em>
                </div>
              ) : summaryFailed ? (
                <div className="failed-summary">
                  <em>Summary unavailable</em>
                </div>
              ) : null}
            </div>
          )}

          {/* Comments for compact view */}
          {expandedStory === story.id && (
            <div className="compact-comments-section">
              <CommentsErrorBoundary>
                <Comments storyId={story.id} />
              </CommentsErrorBoundary>
            </div>
          )}
        </div>
      )}

      {/* Full View - Full story card with header, content, and footer */}
      {viewMode === 'full' && (
        <>
          <h2 className="story-title">
            {story.url ? (
              <a href={story.url} target="_blank" rel="noopener noreferrer">
                {getStoryIcon(story)} {story.title}
              </a>
            ) : (
              <span>{getStoryIcon(story)} {story.title}</span>
            )}
          </h2>

          <div className="story-card">
            <div className="story-card-header">
              <div className="user-avatar">
                <div className="avatar-placeholder">
                  {story.by?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <div className="story-meta-header">
                <div className="story-author">
                  <a href={`https://news.ycombinator.com/user?id=${story.by}`} target="_blank" rel="noopener noreferrer">
                    {story.by}
                  </a>
                </div>
                <div className="story-timestamp">
                  <span className="story-type-icon">{getStoryIcon(story)}</span>
                  <span className="story-time">{formatTimeAgo(story.time)}</span>
                  {story.url && (
                    <>
                      {' • '}
                      <a 
                        href={story.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="story-source"
                      >
                        {(() => {
                          try {
                            return new URL(story.url).hostname;
                          } catch {
                            return story.url;
                          }
                        })()}
                      </a>
                    </>
                  )}
                </div>
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
                  {summary ? (
                    <div className="auto-summary">{summary}</div>
                  ) : loadingSummary ? (
                    <div className="loading-summary">
                      <em>Loading summary...</em>
                    </div>
                  ) : summaryFailed ? (
                    <div className="failed-summary">
                      <em>Summary unavailable</em>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="story-footer">
              <div className="story-stats">
                {story.score && (
                  <span className="story-points">{story.score} points</span>
                )}
                {story.descendants && (
                  <button 
                    className="story-comments-btn"
                    onClick={() => onToggleComments(story.id)}
                  >
                    {story.descendants} comments
                  </button>
                )}
              </div>

              <div className="story-actions">
                {story.url && (
                  <a 
                    href={story.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="story-action-link"
                  >
                    View Article
                  </a>
                )}
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
                <CommentsErrorBoundary>
                  <Comments storyId={story.id} />
                </CommentsErrorBoundary>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.story.id === nextProps.story.id &&
         prevProps.viewMode === nextProps.viewMode &&
         prevProps.expandedStory === nextProps.expandedStory &&
         prevProps.summary === nextProps.summary &&
         prevProps.loadingSummary === nextProps.loadingSummary &&
         prevProps.summaryFailed === nextProps.summaryFailed;
});