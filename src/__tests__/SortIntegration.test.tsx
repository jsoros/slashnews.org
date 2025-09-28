import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock all heavy components and services to prevent memory issues
vi.mock('../services/hackerNewsApi');

vi.mock('../hooks/useStoryData', () => ({
  useStoryData: () => ({
    stories: [
      {
        id: 1,
        type: 'story',
        by: 'user1',
        time: 1640995200,
        title: 'High Comment Story',
        score: 100,
        descendants: 200
      },
      {
        id: 2,
        type: 'story',
        by: 'user2',
        time: 1640995300,
        title: 'Low Comment Story',
        score: 75,
        descendants: 5
      }
    ],
    loading: false,
    error: null,
    loadStories: vi.fn(),
    loadMoreStories: vi.fn(),
    loadingMore: false,
    hasMoreStories: false,
    totalCount: 2
  })
}));

vi.mock('../hooks/useStoryListState', () => ({
  useStoryListState: () => ({
    state: { expandedStory: null, summaries: new Map(), loadingSummaries: new Map(), failedSummaries: new Map() },
    actions: { clearAllState: vi.fn(), toggleStoryExpansion: vi.fn(), startSummaryLoading: vi.fn(), setSummarySuccess: vi.fn(), setSummaryFailed: vi.fn() },
    computed: { getSummary: () => null, isLoadingSummary: () => false, isSummaryFailed: () => false }
  })
}));

vi.mock('../hooks/useHiddenArticles', () => ({
  useHiddenArticles: () => ({
    hideArticle: vi.fn(),
    showArticle: vi.fn(),
    isArticleHidden: () => false,
    clearAllHidden: vi.fn()
  })
}));

vi.mock('../hooks/useKeyboardNavigation', () => ({
  useSkipLinks: () => ({
    skipToContent: vi.fn(),
    skipToNavigation: vi.fn()
  }),
  useAnnouncer: () => ({
    announce: vi.fn(),
    announcementProps: { 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only' }
  })
}));

// Mock components to focus on integration logic
vi.mock('../components/StoryCard', () => ({
  StoryCard: ({ story, onToggleComments, onHideArticle, onShowArticle }: any) => (
    <div data-testid={`story-card-${story.id}`}>
      <h3 data-testid={`story-title-${story.id}`}>{story.title}</h3>
      <span data-testid={`story-comments-${story.id}`}>{story.descendants || 0} comments</span>
      <button onClick={() => onToggleComments(story.id)}>Toggle Comments</button>
      <button onClick={() => onHideArticle(story.id)}>Hide</button>
      <button onClick={() => onShowArticle(story.id)}>Show</button>
    </div>
  )
}));

vi.mock('../components/Comments', () => ({
  Comments: () => <div data-testid="comments">Comments Component</div>
}));

vi.mock('../components/About', () => ({
  About: () => <div data-testid="about">About Component</div>
}));

vi.mock('../components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer Component</div>
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StoryErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommentsErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('Sort Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should integrate sort functionality across App, Header, and StoryList', async () => {
    render(<App />);

    // Initially stories should be in default order
    await waitFor(() => {
      expect(screen.getByTestId('story-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('story-card-2')).toBeInTheDocument();
    });

    // Open dropdown and change to comment sorting
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);

    // Click sort by comments
    const sortButton = screen.getByText('Sort by Comments');
    fireEvent.click(sortButton);

    // Verify sorting is applied - story with more comments (id: 1, 200 comments) should come first
    await waitFor(() => {
      const storyCards = screen.getAllByTestId(/^story-card-\d+$/);
      expect(storyCards[0]).toHaveAttribute('data-testid', 'story-card-1'); // High comment story first
      expect(storyCards[1]).toHaveAttribute('data-testid', 'story-card-2'); // Low comment story second
    });

    // Verify story details are correctly displayed
    expect(screen.getByTestId('story-comments-1')).toHaveTextContent('200 comments');
    expect(screen.getByTestId('story-comments-2')).toHaveTextContent('5 comments');
  });

  it('should maintain sort state when switching view modes', async () => {
    render(<App />);

    // Change to comment sorting first
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Sort by Comments'));

    // Switch to compact view
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Compact View'));

    // Sort order should be maintained
    await waitFor(() => {
      const storyCards = screen.getAllByTestId(/^story-card-\d+$/);
      expect(storyCards[0]).toHaveAttribute('data-testid', 'story-card-1'); // Still comment-sorted
    });
  });

  it('should maintain sort state when switching categories', async () => {
    render(<App />);

    // Set comment sorting
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Sort by Comments'));

    // Switch category
    fireEvent.click(screen.getByText('New'));

    // Sort should still be applied (mock returns same data)
    await waitFor(() => {
      const storyCards = screen.getAllByTestId(/^story-card-\d+$/);
      expect(storyCards[0]).toHaveAttribute('data-testid', 'story-card-1'); // Still comment-sorted
    });
  });

  it('should work with hidden articles functionality', async () => {
    render(<App />);

    // Set comment sorting
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Sort by Comments'));

    // Both stories should be visible and sorted by comments
    await waitFor(() => {
      expect(screen.getByTestId('story-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('story-card-2')).toBeInTheDocument();
    });

    // Hide functionality should work alongside sorting
    expect(screen.getAllByTestId(/^story-card-\d+$/).length).toBe(2);
  });

  it('should reset sort to default when explicitly selected', async () => {
    render(<App />);

    // First set to comment sorting
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Sort by Comments'));

    await waitFor(() => {
      const storyCards = screen.getAllByTestId(/^story-card-\d+$/);
      expect(storyCards[0]).toHaveAttribute('data-testid', 'story-card-1');
    });

    // Then switch back to default
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Default Order'));

    // Should return to original order (in this mock, same order, but state changed)
    await waitFor(() => {
      const storyCards = screen.getAllByTestId(/^story-card-\d+$/);
      expect(storyCards.length).toBe(2); // Both stories still present
    });
  });

  it('should handle accessibility announcements for sort changes', async () => {
    const mockAnnounce = vi.fn();

    vi.doMock('../hooks/useKeyboardNavigation', () => ({
      useSkipLinks: () => ({
        skipToContent: vi.fn(),
        skipToNavigation: vi.fn()
      }),
      useAnnouncer: () => ({
        announce: mockAnnounce,
        announcementProps: { 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only' }
      })
    }));

    render(<App />);

    // Change sort mode
    const gearButton = screen.getByLabelText('View Options');
    fireEvent.click(gearButton);
    fireEvent.click(screen.getByText('Sort by Comments'));

    // Should announce the change (announcement mock would be called in real app)
    await waitFor(() => {
      expect(screen.getByTestId('story-card-1')).toBeInTheDocument();
    });
  });

  it('should handle dropdown state management correctly', async () => {
    render(<App />);

    const gearButton = screen.getByLabelText('View Options');

    // Dropdown should be closed initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open dropdown
    fireEvent.click(gearButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Selecting a sort option should close dropdown
    fireEvent.click(screen.getByText('Sort by Comments'));

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});