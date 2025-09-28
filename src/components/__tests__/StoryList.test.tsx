import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StoryList } from '../StoryList';
import { hackerNewsApi } from '../../services/hackerNewsApi';

vi.mock('../../services/hackerNewsApi');
const mockedApi = vi.mocked(hackerNewsApi);

describe.skip('StoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    mockedApi.getTopStories.mockImplementation(() => new Promise(() => {}));
    mockedApi.getItems.mockImplementation(() => new Promise(() => {}));
    
    render(<StoryList viewMode="full" sortMode="default" />);
    
    expect(screen.getByText('Loading stories...')).toBeInTheDocument();
  });

  it('should display stories after loading', async () => {
    const mockStories = [
      {
        id: 1,
        type: 'story' as const,
        by: 'testuser',
        time: 1640995200,
        title: 'Test Story',
        url: 'https://example.com',
        score: 100,
        descendants: 50
      },
      {
        id: 2,
        type: 'story' as const,
        by: 'anotheruser',
        time: 1640995300,
        title: 'Another Story',
        score: 75,
        descendants: 25
      }
    ];

    mockedApi.getTopStories.mockResolvedValue([1, 2]);
    mockedApi.getItems.mockResolvedValue(mockStories);
    
    render(<StoryList viewMode="full" sortMode="default" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Test Story/)).toBeInTheDocument();
      expect(screen.getByText(/Another Story/)).toBeInTheDocument();
    });

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText(/100 points/)).toBeInTheDocument();
    expect(screen.getByText(/50 comments/)).toBeInTheDocument();
  });

  it('should display error message when loading fails', async () => {
    mockedApi.getTopStories.mockRejectedValue(new Error('API Error'));
    
    render(<StoryList viewMode="full" sortMode="default" />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load stories. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should fetch different story types based on category', async () => {
    const mockStoryIds = [1, 2, 3];
    const mockStories = [
      { id: 1, type: 'story' as const, by: 'user1', time: 1640995200, title: 'Story 1' },
      { id: 2, type: 'story' as const, by: 'user2', time: 1640995300, title: 'Story 2' },
      { id: 3, type: 'story' as const, by: 'user3', time: 1640995400, title: 'Story 3' }
    ];

    mockedApi.getNewStories.mockResolvedValue(mockStoryIds);
    mockedApi.getItems.mockResolvedValue(mockStories);
    
    render(<StoryList category="new" viewMode="full" sortMode="default" />);
    
    await waitFor(() => {
      expect(mockedApi.getNewStories).toHaveBeenCalled();
      expect(mockedApi.getItems).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  it('should fetch best stories when category is best', async () => {
    const mockStoryIds = [4, 5, 6];
    const mockStories = [
      { id: 4, type: 'story' as const, by: 'user4', time: 1640995200, title: 'Best Story' }
    ];

    mockedApi.getBestStories.mockResolvedValue(mockStoryIds);
    mockedApi.getItems.mockResolvedValue(mockStories);
    
    render(<StoryList category="best" viewMode="full" sortMode="default" />);
    
    await waitFor(() => {
      expect(mockedApi.getBestStories).toHaveBeenCalled();
      expect(mockedApi.getItems).toHaveBeenCalledWith([4, 5, 6]);
    });
  });
});