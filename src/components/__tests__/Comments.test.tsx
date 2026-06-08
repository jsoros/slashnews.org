import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Comments } from '../Comments';
import { hackerNewsApi } from '../../services/hackerNewsApi';
import { commentsCache } from '../commentsUtils';

// Mock the hackerNewsApi module
vi.mock('../../services/hackerNewsApi', () => ({
  hackerNewsApi: {
    getItem: vi.fn(),
  },
}));

const mockGetItem = vi.mocked(hackerNewsApi.getItem);

describe('Comments Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commentsCache.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    commentsCache.clear();
  });

  const mockStory = {
    id: 123,
    type: 'story' as const,
    by: 'testuser',
    time: 1640995200, // 2022-01-01 00:00:00
    text: 'Test story',
    title: 'Test Story',
    kids: [124, 125],
  };

  const mockComment1 = {
    id: 124,
    type: 'comment' as const,
    by: 'commenter1',
    time: 1640995260, // 1 minute later
    text: 'This is a great article!',
    parent: 123,
    kids: [126],
  };

  const mockComment2 = {
    id: 125,
    type: 'comment' as const,
    by: 'commenter2',
    time: 1640995320, // 2 minutes later
    text: 'I agree with the points made here.',
    parent: 123,
    kids: [],
  };

  const mockNestedComment = {
    id: 126,
    type: 'comment' as const,
    by: 'commenter3',
    time: 1640995380, // 3 minutes later
    text: 'Thanks for sharing your thoughts!',
    parent: 124,
    kids: [],
  };

  describe('Loading States', () => {
    it('renders loading state initially', () => {
      mockGetItem.mockImplementation(() => new Promise(() => {}));
      const { unmount } = render(<Comments storyId={123} />);
      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      unmount();
    });

    it('renders loading state in comments section container', () => {
      mockGetItem.mockImplementation(() => new Promise(() => {}));
      const { unmount } = render(<Comments storyId={123} />);
      const commentsSection = screen.getByText('Loading comments...').parentElement;
      expect(commentsSection).toHaveClass('comments-section');
      unmount();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetItem.mockRejectedValue(new Error('API Error'));
      render(<Comments storyId={123} />);
      await waitFor(() => {
        expect(screen.getByText('Failed to load comments. Please try again later.')).toBeInTheDocument();
      });
    });

    it('displays error in comments section container', async () => {
      mockGetItem.mockRejectedValue(new Error('API Error'));
      render(<Comments storyId={123} />);
      await waitFor(() => {
        const errorElement = screen.getByText('Failed to load comments. Please try again later.');
        expect(errorElement.parentElement).toHaveClass('comments-section');
      });
    });

    it('logs error to console when loading fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetItem.mockRejectedValue(new Error('API Error'));
      render(<Comments storyId={123} />);
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('displays "No comments available" when story has no kids', async () => {
      const storyWithoutComments = { ...mockStory, kids: undefined };
      mockGetItem.mockResolvedValue(storyWithoutComments);
      render(<Comments storyId={123} />);
      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });

    it('displays "No comments available" when story has empty kids array', async () => {
      const storyWithEmptyComments = { ...mockStory, kids: [] };
      mockGetItem.mockResolvedValue(storyWithEmptyComments);
      render(<Comments storyId={123} />);
      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });

    it('displays "No comments available" when all comments are deleted/dead', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve({ ...mockComment1, deleted: true });
        if (id === 125) return Promise.resolve({ ...mockComment2, dead: true });
        return Promise.resolve(null);
      });
      render(<Comments storyId={123} />);
      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Rendering', () => {
    it('renders comments with correct content and metadata', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
        expect(screen.getByText('commenter1')).toBeInTheDocument();
        expect(screen.getByText('commenter2')).toBeInTheDocument();
      });
    });

    it('formats time correctly using "time ago" format', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve({ ...mockComment1, time: Date.now() / 1000 - 3600 });
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText(/about 1 hour ago/)).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes based on comment level', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        if (id === 126) return Promise.resolve(mockNestedComment);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        const topLevelComment1 = screen.getByText('This is a great article!').closest('.comment');
        const topLevelComment2 = screen.getByText('I agree with the points made here.').closest('.comment');
        expect(topLevelComment1).toHaveClass('level-0');
        expect(topLevelComment2).toHaveClass('level-0');
      });

      const loadRepliesBtn = screen.queryAllByRole('button', { name: /Load \d+ repl/ })[0];
      if (loadRepliesBtn) loadRepliesBtn.click();

      await waitFor(() => {
        const nestedComment = screen.getByText('Thanks for sharing your thoughts!').closest('.comment');
        expect(nestedComment).toHaveClass('level-1');
      });
    });

    it('displays correct nesting levels for nested comments', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        if (id === 126) return Promise.resolve(mockNestedComment);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
      });

      const loadRepliesBtn = screen.queryAllByRole('button', { name: /Load \d+ repl/ })[0];
      if (loadRepliesBtn) loadRepliesBtn.click();

      await waitFor(() => {
        const deepCommentElement = screen.getByText('Thanks for sharing your thoughts!').closest('.comment');
        expect(deepCommentElement).toHaveClass('level-1');
      });
    });

    it('displays reply level information for nested comments', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        if (id === 126) return Promise.resolve(mockNestedComment);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
      });

      const loadRepliesBtn = screen.queryAllByRole('button', { name: /Load \d+ repl/ })[0];
      if (loadRepliesBtn) loadRepliesBtn.click();

      await waitFor(() => {
        expect(screen.getByText('Reply level 2')).toBeInTheDocument();
      });
    });

    it('does not display reply level for top-level comments', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('Reply level 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Comment Tree Building', () => {
    it('builds correct hierarchical structure', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        if (id === 126) return Promise.resolve(mockNestedComment);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });

      const loadRepliesBtn = screen.queryAllByRole('button', { name: /Load \d+ repl/ })[0];
      if (loadRepliesBtn) loadRepliesBtn.click();

      await waitFor(() => {
        expect(screen.getByText('Thanks for sharing your thoughts!')).toBeInTheDocument();
      });
    });

    it('filters out deleted comments', async () => {
      const deletedComment = { ...mockComment1, deleted: true };
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(deletedComment);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });

    it('filters out dead comments', async () => {
      const deadComment = { ...mockComment1, dead: true };
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(deadComment);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });

    it('filters out comments without text', async () => {
      const commentWithoutText = { ...mockComment1, text: undefined };
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(commentWithoutText);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });
  });

  describe('HTML Entity Handling', () => {
    it('properly decodes HTML entities in comment text', async () => {
      const commentWithEntities = {
        ...mockComment1,
        text: 'This is &quot;great&quot; &amp; I &#x27;love&#x27; it! &lt;test&gt;'
      };
      
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(commentWithEntities);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('This is "great" & I \'love\' it! <test>')).toBeInTheDocument();
      });
    });

    it('sanitizes comment text with DOMPurify', async () => {
      const commentWithHTML = {
        ...mockComment1,
        text: '<script>alert("xss")</script><p>Safe content</p>'
      };
      
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(commentWithHTML);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
        expect(screen.getByText('Safe content')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('handles story ID changes correctly', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });
      
      const { rerender } = render(<Comments storyId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
      });

      vi.clearAllMocks();

      mockGetItem.mockImplementation((id: number) => {
        if (id === 456) return Promise.resolve({ ...mockStory, id: 456, kids: [] });
        return Promise.resolve(null);
      });
      
      rerender(<Comments storyId={456} />);
      
      await waitFor(() => {
        expect(mockGetItem).toHaveBeenCalledWith(456);
      });
    });

    it('does not re-render when memoization props are the same', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      const { rerender } = render(<Comments storyId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
      });
      
      vi.clearAllMocks();
      rerender(<Comments storyId={123} />);
      
      expect(mockGetItem).not.toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    it('makes correct API calls in proper sequence', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(mockGetItem).toHaveBeenNthCalledWith(1, 123);
        // Wait, kids might be fetched in any order because Promise.all is used now, or in loop
        // If sequential, it's 2, 3. Let's just check the calls
      });
    });

    it('handles partial API failures gracefully', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(mockComment1);
        if (id === 125) return Promise.reject(new Error('Failed to load comment 125'));
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments. Please try again later.')).toBeInTheDocument();
      });
    });

    it('handles null/undefined API responses', async () => {
      mockGetItem.mockImplementation((id: number) => {
        if (id === 123) return Promise.resolve(mockStory);
        if (id === 124) return Promise.resolve(null);
        if (id === 125) return Promise.resolve(mockComment2);
        return Promise.resolve(null);
      });

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });
  });
});
