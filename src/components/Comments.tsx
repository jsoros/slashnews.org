import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { hackerNewsApi, type HackerNewsItem } from '../services/hackerNewsApi';

interface CommentsProps {
  storyId: number;
}

interface CommentWithLevel extends HackerNewsItem {
  level: number;
}

export const Comments: React.FC<CommentsProps> = ({ storyId }) => {
  const [comments, setComments] = useState<CommentWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildCommentTree = useCallback(async (
    commentIds: number[], 
    level: number
  ): Promise<CommentWithLevel[]> => {
    const comments: CommentWithLevel[] = [];
    
    for (const id of commentIds) {
      const comment = await hackerNewsApi.getItem(id);
      if (comment && !comment.deleted && !comment.dead && comment.text) {
        const commentWithLevel: CommentWithLevel = { ...comment, level };
        comments.push(commentWithLevel);
        
        if (comment.kids && comment.kids.length > 0) {
          const childComments = await buildCommentTree(comment.kids, level + 1);
          comments.push(...childComments);
        }
      }
    }
    
    return comments;
  }, []);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const story = await hackerNewsApi.getItem(storyId);
      if (!story || !story.kids) {
        setComments([]);
        return;
      }

      const commentsData = await buildCommentTree(story.kids, 0);
      setComments(commentsData);
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

  const formatCommentText = (text: string): string => {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
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

  return (
    <div className="comments-section">
      <h4>Comments ({comments.length})</h4>
      {comments.map((comment) => (
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
          </div>
          <div 
            className="comment-text"
            dangerouslySetInnerHTML={{ 
              __html: formatCommentText(comment.text || '') 
            }}
          />
        </div>
      ))}
    </div>
  );
};