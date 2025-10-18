import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import { hackerNewsApi } from '../services/hackerNewsApi';
import type { CommentWithLevel } from './commentsUtils';
import { commentsCache } from './commentsUtils';

interface CommentsProps {
  storyId: number;
}

export const Comments = React.memo<CommentsProps>(({ storyId }) => {
  const [comments, setComments] = useState<CommentWithLevel[]>(() => {
    // Check cache on initial render
    return commentsCache.get(storyId) || [];
  });
  const [loading, setLoading] = useState(() => !commentsCache.has(storyId));
  const [error, setError] = useState<string | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());
  const [loadedReplies, setLoadedReplies] = useState<Set<number>>(new Set()); // Track which comments have loaded replies
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set()); // Track which comments are currently loading replies

  // Use refs to avoid stale closures
  const commentsRef = useRef(comments);
  const loadedRepliesRef = useRef(loadedReplies);
  const loadingRepliesRef = useRef(loadingReplies);

  // Update refs on every render
  commentsRef.current = comments;
  loadedRepliesRef.current = loadedReplies;
  loadingRepliesRef.current = loadingReplies;

  const toggleThread = useCallback((commentId: number) => {
    setCollapsedThreads(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const buildCommentTree = useCallback(async (
    commentIds: number[],
    level: number,
    maxDepth: number = Infinity
  ): Promise<CommentWithLevel[]> => {
    const comments: CommentWithLevel[] = [];

    for (const id of commentIds) {
      const comment = await hackerNewsApi.getItem(id);
      if (comment && !comment.deleted && !comment.dead && comment.text) {
        const hasReplies = comment.kids && comment.kids.length > 0;
        const shouldLoadReplies = hasReplies && level < maxDepth;

        const commentWithLevel: CommentWithLevel = {
          ...comment,
          level,
          hasUnloadedReplies: hasReplies && !shouldLoadReplies,
          replyCount: hasReplies ? comment.kids!.length : undefined
        };
        comments.push(commentWithLevel);

        if (shouldLoadReplies) {
          const childComments = await buildCommentTree(comment.kids!, level + 1, maxDepth);
          comments.push(...childComments);
        }
      }
    }

    return comments;
  }, []);

  const loadRepliesForComment = useCallback(async (commentId: number) => {
    console.log(`[loadRepliesForComment] Called for comment ${commentId}`);
    console.log(`[loadRepliesForComment] loadedReplies:`, Array.from(loadedRepliesRef.current));
    console.log(`[loadRepliesForComment] loadingReplies:`, Array.from(loadingRepliesRef.current));
    console.log(`[loadRepliesForComment] comments count:`, commentsRef.current.length);

    // Don't load if already loaded or loading - access refs directly for latest state
    if (loadedRepliesRef.current.has(commentId)) {
      console.log(`[loadRepliesForComment] Comment ${commentId} already loaded, skipping`);
      return;
    }

    if (loadingRepliesRef.current.has(commentId)) {
      console.log(`[loadRepliesForComment] Comment ${commentId} currently loading, skipping`);
      return;
    }

    // Mark as loading
    setLoadingReplies(prev => new Set(prev).add(commentId));

    try {
      // Find the comment in the current comments array - access ref directly
      const commentIndex = commentsRef.current.findIndex(c => c.id === commentId);
      console.log(`[loadRepliesForComment] Found comment at index ${commentIndex}`);

      if (commentIndex === -1) {
        console.warn(`Comment ${commentId} not found in comments array`);
        return;
      }

      const comment = commentsRef.current[commentIndex];
      console.log(`[loadRepliesForComment] Comment has ${comment.kids?.length || 0} kids`);

      if (!comment.kids || comment.kids.length === 0) {
        console.warn(`Comment ${commentId} has no kids to load`);
        return;
      }

      // Load the replies recursively (all levels)
      const replies = await buildCommentTree(comment.kids, comment.level + 1);
      console.log(`[loadRepliesForComment] Loaded ${replies.length} replies for comment ${commentId}`);

      // Insert replies after the parent comment
      setComments(prev => {
        const newComments = [...prev];
        const idx = newComments.findIndex(c => c.id === commentId);
        if (idx === -1) {
          console.warn(`[loadRepliesForComment] Comment ${commentId} not found when inserting replies`);
          return prev;
        }

        // Update the parent to mark replies as loaded
        newComments[idx] = {
          ...newComments[idx],
          hasUnloadedReplies: false
        };
        // Insert all replies after the parent
        newComments.splice(idx + 1, 0, ...replies);
        console.log(`[loadRepliesForComment] Inserted ${replies.length} replies after index ${idx}`);
        return newComments;
      });

      // Mark as loaded
      setLoadedReplies(prev => new Set(prev).add(commentId));
      console.log(`[loadRepliesForComment] Marked comment ${commentId} as loaded`);
    } catch (err) {
      console.error(`Failed to load replies for comment ${commentId}:`, err);
    } finally {
      // Remove from loading
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, [buildCommentTree]);

  const loadComments = useCallback(async () => {
    // Check cache first
    if (commentsCache.has(storyId)) {
      const cached = commentsCache.get(storyId)!;
      setComments(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const story = await hackerNewsApi.getItem(storyId);
      if (!story || !story.kids) {
        setComments([]);
        commentsCache.set(storyId, []);
        return;
      }

      // Load all comments recursively
      const commentsData = await buildCommentTree(story.kids, 0);
      setComments(commentsData);
      commentsCache.set(storyId, commentsData); // Cache the results
    } catch (err) {
      setError('Failed to load comments. Please try again later.');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [storyId, buildCommentTree]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const formatTimeAgo = (timestamp: number): string => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  // Configure DOMPurify to add target="_blank" and rel="noopener noreferrer" to all links
  const sanitizeConfig = {
    ADD_ATTR: ['target'],
    ALLOWED_TAGS: ['a', 'p', 'i', 'code', 'pre', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  };

  const sanitizeComment = (text: string): string => {
    const clean = DOMPurify.sanitize(text, sanitizeConfig);
    // Add target="_blank" and rel="noopener noreferrer" to all links
    return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
  };

  if (loading) {
    return (
      <div className="comments-section">
        <div className="loading">Loading comments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comments-section">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="comments-section">
        <p>No comments available.</p>
      </div>
    );
  }

  // Filter comments to hide collapsed threads
  const visibleComments = comments.filter((comment, index) => {
    // Check if this comment is inside a collapsed thread by looking backwards
    // through all parent levels
    for (let i = index - 1; i >= 0; i--) {
      const prevComment = comments[i];

      // If we find a comment at a lower level (parent level)
      if (prevComment.level < comment.level) {
        // Check if this parent is collapsed
        if (collapsedThreads.has(prevComment.id)) {
          return false; // This comment is inside a collapsed thread
        }
        // If the parent level is not collapsed, continue checking grandparents
        // Don't break - we need to check all ancestor levels
      } else if (prevComment.level >= comment.level) {
        // This is a sibling or cousin, keep going back
        continue;
      }
    }
    return true;
  });

  return (
    <div className="comments-section">
      {visibleComments.map((comment) => {
        const isCollapsed = collapsedThreads.has(comment.id);
        const hasChildren = comments.some((c, idx) => {
          const commentIdx = comments.indexOf(comment);
          return idx > commentIdx && c.level > comment.level;
        });
        const isLoadingReplies = loadingReplies.has(comment.id);

        return (
          <div
            key={comment.id}
            className={`comment level-${Math.min(comment.level, 4)}`}
          >
            <div className="comment-header">
              <span className="comment-author">{comment.by}</span>
              {' • '}
              <span>{formatTimeAgo(comment.time)}</span>
              {comment.level > 0 && (
                <>
                  {' • '}
                  <span>Reply level {comment.level + 1}</span>
                </>
              )}
              {hasChildren && (
                <button
                  className="collapse-button"
                  onClick={() => toggleThread(comment.id)}
                  aria-label={isCollapsed ? 'Expand thread' : 'Collapse thread'}
                >
                  {isCollapsed ? '[+]' : '[\u2212]'}
                </button>
              )}
              {comment.hasUnloadedReplies && !isCollapsed && (
                <button
                  className="load-replies-button"
                  onClick={() => loadRepliesForComment(comment.id)}
                  disabled={isLoadingReplies}
                  aria-label={`Load ${comment.replyCount} replies`}
                >
                  {isLoadingReplies
                    ? 'Loading...'
                    : `Load ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`
                  }
                </button>
              )}
            </div>
            {!isCollapsed && (
              <div
                className="comment-text"
                dangerouslySetInnerHTML={{
                  __html: sanitizeComment(comment.text || '')
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.storyId === nextProps.storyId;
});

export const preloadComments = async (
  storyId: number,
  buildCommentTree: (commentIds: number[], level: number) => Promise<CommentWithLevel[]>,
  api: typeof hackerNewsApi
) => {
  if (commentsCache.has(storyId)) {
    return;
  }

  try {
    const story = await api.getItem(storyId);
    if (!story || !story.kids) {
      commentsCache.set(storyId, []);
      return;
    }

    const commentsData = await buildCommentTree(story.kids, 0);
    commentsCache.set(storyId, commentsData);
  } catch (err) {
    console.error('Error preloading comments:', err);
  }
};