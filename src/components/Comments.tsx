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
    if (loadedRepliesRef.current.has(commentId)) return;
    if (loadingRepliesRef.current.has(commentId)) return;

    setLoadingReplies(prev => new Set(prev).add(commentId));

    try {
      const commentIndex = commentsRef.current.findIndex(c => c.id === commentId);
      if (commentIndex === -1) return;

      const comment = commentsRef.current[commentIndex];
      if (!comment.kids || comment.kids.length === 0) return;

      const replies = await buildCommentTree(comment.kids, comment.level + 1);

      setComments(prev => {
        const newComments = [...prev];
        const idx = newComments.findIndex(c => c.id === commentId);
        if (idx === -1) return prev;

        newComments[idx] = {
          ...newComments[idx],
          hasUnloadedReplies: false
        };
        newComments.splice(idx + 1, 0, ...replies);
        return newComments;
      });

      setLoadedReplies(prev => new Set(prev).add(commentId));
    } catch (err) {
      console.error(`Failed to load replies for comment ${commentId}:`, err);
    } finally {
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, [buildCommentTree]);

  const loadComments = useCallback(async () => {
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
      if (!story || !story.kids || story.kids.length === 0) {
        setComments([]);
        commentsCache.set(storyId, []);
        setLoading(false);
        return;
      }

      const commentsData = await buildCommentTree(story.kids, 0, 0);
      if (commentsData.length === 0) {
        setComments([]);
        commentsCache.set(storyId, []);
        setLoading(false);
        return;
      }
      setComments(commentsData);
      commentsCache.set(storyId, commentsData);
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

  const sanitizeConfig = {
    ALLOWED_TAGS: ['a', 'p', 'i', 'code', 'pre', 'br'],
    ALLOWED_ATTR: ['href']
  };

  const sanitizeComment = (text: string): string => {
    // Safely add target="_blank" and rel="noopener noreferrer" using a DOMPurify hook
    // We add and remove the hook so this behavior is scoped only to this function call
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName && node.tagName.toLowerCase() === 'a') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    const clean = DOMPurify.sanitize(text, sanitizeConfig);

    DOMPurify.removeHook('afterSanitizeAttributes');
    return clean;
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
  // Optimized O(N) approach using a single forward pass
  const visibleComments: (typeof comments[0] & { hasChildren: boolean })[] = [];
  let currentCollapsedLevel: number | null = null;

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];

    // Check if we're currently inside a collapsed thread
    if (currentCollapsedLevel !== null) {
      if (comment.level <= currentCollapsedLevel) {
        // We've popped out of the collapsed thread's descendants
        currentCollapsedLevel = null;
      } else {
        // This is a descendant of a collapsed thread, skip it
        continue;
      }
    }

    // Determine if this comment has children in O(1) time
    // A comment has children if the next comment in the array is at a deeper level
    const hasChildren = i < comments.length - 1 && comments[i + 1].level > comment.level;

    visibleComments.push({ ...comment, hasChildren });

    // If this visible comment is collapsed, track its level
    if (collapsedThreads.has(comment.id)) {
      currentCollapsedLevel = comment.level;
    }
  }

  return (
    <div className="comments-section">
      {visibleComments.map((comment) => {
        const isCollapsed = collapsedThreads.has(comment.id);
        const hasChildren = comment.hasChildren;
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