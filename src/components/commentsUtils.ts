import type { HackerNewsItem } from '../services/hackerNewsApi';
import type { hackerNewsApi } from '../services/hackerNewsApi';

export interface CommentWithLevel extends HackerNewsItem {
  level: number;
  hasUnloadedReplies?: boolean;
  replyCount?: number;
}

export const commentsCache = new Map<number, CommentWithLevel[]>();
export const loadingCommentsSet = new Set<number>();

export async function preloadComments(
  storyId: number,
  buildCommentTree: (commentIds: number[], level: number) => Promise<CommentWithLevel[]>,
  api: typeof hackerNewsApi
): Promise<void> {
  if (commentsCache.has(storyId) || loadingCommentsSet.has(storyId)) {
    return;
  }

  loadingCommentsSet.add(storyId);

  try {
    const story = await api.getItem(storyId);
    if (!story || !story.kids) {
      commentsCache.set(storyId, []);
      return;
    }

    const commentsData = await buildCommentTree(story.kids, 0);
    commentsCache.set(storyId, commentsData);
  } catch (err) {
    console.warn(`Failed to preload comments for story ${storyId}:`, err);
  } finally {
    loadingCommentsSet.delete(storyId);
  }
}
