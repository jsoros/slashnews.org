import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Comments } from '../Comments';
import { hackerNewsApi } from '../../services/hackerNewsApi';

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
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
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
      // Use a promise that will be cleaned up instead of never-resolving
      let resolvePromise: (value: any) => void = () => {};
      const pendingPromise: Promise<any> = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetItem.mockReturnValue(pendingPromise);
      
      const { unmount } = render(<Comments storyId={123} />);
      
      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      
      // Cleanup: resolve promise and unmount to prevent memory leaks
      resolvePromise(null);
      unmount();
    });

    it('renders loading state in comments section container', () => {
      // Use a promise that will be cleaned up instead of never-resolving
      let resolvePromise: (value: any) => void = () => {};
      const pendingPromise: Promise<any> = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetItem.mockReturnValue(pendingPromise);
      
      const { unmount } = render(<Comments storyId={123} />);
      
      const commentsSection = screen.getByText('Loading comments...').parentElement;
      expect(commentsSection).toHaveClass('comments-section');
      
      // Cleanup: resolve promise and unmount to prevent memory leaks
      resolvePromise(null);
      unmount();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('API Error'));

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments. Please try again later.')).toBeInTheDocument();
      });
    });

    it('displays error in comments section container', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('API Error'));

      render(<Comments storyId={123} />);

      await waitFor(() => {
        const errorMessage = screen.getByText('Failed to load comments. Please try again later.');
        expect(errorMessage.parentElement).toHaveClass('comments-section');
      });
    });

    it('logs error to console when loading fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('API Error');
      mockGetItem.mockRejectedValueOnce(testError);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading comments:', testError);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('displays "No comments available" when story has no kids', async () => {
      const storyWithoutComments = { ...mockStory, kids: undefined };
      mockGetItem.mockResolvedValueOnce(storyWithoutComments);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });

    it('displays "No comments available" when story has empty kids array', async () => {
      const storyWithEmptyKids = { ...mockStory, kids: [] };
      mockGetItem.mockResolvedValueOnce(storyWithEmptyKids);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });

    it('displays "No comments available" when all comments are deleted/dead', async () => {
      const deletedComment = { ...mockComment1, deleted: true };
      const deadComment = { ...mockComment2, dead: true };
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(deletedComment)
        .mockResolvedValueOnce(deadComment);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('No comments available.')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Rendering', () => {
    it('renders comments with correct content and metadata', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (2)')).toBeInTheDocument();
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
        expect(screen.getByText('commenter1')).toBeInTheDocument();
        expect(screen.getByText('commenter2')).toBeInTheDocument();
      });
    });

    it('formats time correctly using "time ago" format', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        // Should show relative time
        expect(screen.getByText(/ago/)).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes based on comment level', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockNestedComment);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        const comments = screen.getAllByText(/This is a great article!|Thanks for sharing your thoughts!/);
        const topLevelComment = comments.find(el => el.textContent?.includes('This is a great article!'))?.closest('.comment');
        const nestedComment = comments.find(el => el.textContent?.includes('Thanks for sharing your thoughts!'))?.closest('.comment');
        
        expect(topLevelComment).toHaveClass('level-0');
        expect(nestedComment).toHaveClass('level-1');
      });
    });

    it('limits visual nesting to level 4', async () => {
      // Create deeply nested comments
      const deepComment = {
        id: 127,
        type: 'comment' as const,
        by: 'deepcommenter',
        time: 1640995440,
        text: 'Very deep comment',
        parent: 126,
        kids: [],
      };

      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce({ ...mockComment1, kids: [126] })
        .mockResolvedValueOnce({ ...mockNestedComment, kids: [127] })
        .mockResolvedValueOnce(deepComment);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        const deepCommentElement = screen.getByText('Very deep comment').closest('.comment');
        // Should be clamped to level-4 even though actual level is higher
        expect(deepCommentElement).toHaveClass('level-4');
      });
    });

    it('displays reply level information for nested comments', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockNestedComment);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Reply level 2')).toBeInTheDocument();
      });
    });

    it('does not display reply level for top-level comments', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.queryByText('Reply level 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Comment Tree Building', () => {
    it('builds correct hierarchical structure', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockComment2)
        .mockResolvedValueOnce(mockNestedComment);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (3)')).toBeInTheDocument();
        
        // All comments should be present
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
        expect(screen.getByText('Thanks for sharing your thoughts!')).toBeInTheDocument();
      });
    });

    it('filters out deleted comments', async () => {
      const deletedComment = { ...mockComment1, deleted: true };
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(deletedComment)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (1)')).toBeInTheDocument();
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });

    it('filters out dead comments', async () => {
      const deadComment = { ...mockComment1, dead: true };
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(deadComment)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (1)')).toBeInTheDocument();
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });

    it('filters out comments without text', async () => {
      const commentWithoutText = { ...mockComment1, text: undefined };
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(commentWithoutText)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (1)')).toBeInTheDocument();
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
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(commentWithEntities);

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
      
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(commentWithHTML);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        // Script should be removed, but safe HTML should remain
        expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
        expect(screen.getByText('Safe content')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('handles story ID changes correctly', async () => {
      mockGetItem.mockResolvedValue(mockStory);
      
      const { rerender } = render(<Comments storyId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      });

      // Clear mock and set up for new story
      vi.clearAllMocks();
      mockGetItem.mockResolvedValue({ ...mockStory, id: 456, kids: [] });
      
      rerender(<Comments storyId={456} />);
      
      await waitFor(() => {
        expect(mockGetItem).toHaveBeenCalledWith(456);
      });
    });

    it('does not re-render when memoization props are the same', () => {
      const { rerender } = render(<Comments storyId={123} />);
      
      // Clear mock call count after initial render
      vi.clearAllMocks();
      
      // Re-render with same props
      rerender(<Comments storyId={123} />);
      
      // Should not make new API calls due to memoization
      expect(mockGetItem).not.toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    it('makes correct API calls in proper sequence', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(mockGetItem).toHaveBeenNthCalledWith(1, 123); // Story
        expect(mockGetItem).toHaveBeenNthCalledWith(2, 124); // First comment
        expect(mockGetItem).toHaveBeenNthCalledWith(3, 125); // Second comment
      });
    });

    it('handles partial API failures gracefully', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockComment1)
        .mockRejectedValueOnce(new Error('Failed to load comment 125'));

      render(<Comments storyId={123} />);

      await waitFor(() => {
        // Should show the successfully loaded comment
        expect(screen.getByText('This is a great article!')).toBeInTheDocument();
        // Should show the comment count for only successful comments
        expect(screen.getByText('Comments (1)')).toBeInTheDocument();
      });
    });

    it('handles null/undefined API responses', async () => {
      mockGetItem
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockComment2);

      render(<Comments storyId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Comments (1)')).toBeInTheDocument();
        expect(screen.queryByText('This is a great article!')).not.toBeInTheDocument();
        expect(screen.getByText('I agree with the points made here.')).toBeInTheDocument();
      });
    });
  });
});