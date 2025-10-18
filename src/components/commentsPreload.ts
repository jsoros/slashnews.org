import type { CommentWithLevel } from './commentsUtils';
import { commentsCache } from './commentsUtils';

export const preloadComments = async (
  storyId: number,
  buildCommentTree: (commentIds: number[], level: number) => Promise<CommentWithLevel[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any
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
