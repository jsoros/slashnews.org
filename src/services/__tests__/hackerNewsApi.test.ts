import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { hackerNewsApi, type HackerNewsItem } from '../hackerNewsApi';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('HackerNewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopStories', () => {
    it('should fetch top stories', async () => {
      const mockStoryIds = [1, 2, 3, 4, 5];
      mockedAxios.get.mockResolvedValue({ data: mockStoryIds });

      const result = await hackerNewsApi.getTopStories();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        { timeout: 10000 }
      );
      expect(result).toEqual(mockStoryIds);
    });
  });

  describe('getItem', () => {
    it('should fetch a single item', async () => {
      const mockStory: HackerNewsItem = {
        id: 123,
        type: 'story',
        by: 'testuser',
        time: 1640995200,
        title: 'Test Story',
        url: 'https://example.com',
        score: 100,
        descendants: 50
      };

      mockedAxios.get.mockResolvedValue({ data: mockStory });

      const result = await hackerNewsApi.getItem(123);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/item/123.json',
        { timeout: 8000 }
      );
      expect(result).toEqual(mockStory);
    });

    it('should return null when item fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await hackerNewsApi.getItem(123);

      expect(result).toBeNull();
    });
  });

  describe('getItems', () => {
    it('should fetch multiple items', async () => {
      const mockItems: HackerNewsItem[] = [
        { id: 1, type: 'story', by: 'user1', time: 1640995200, title: 'Story 1' },
        { id: 2, type: 'story', by: 'user2', time: 1640995300, title: 'Story 2' }
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockItems[0] })
        .mockResolvedValueOnce({ data: mockItems[1] });

      const result = await hackerNewsApi.getItems([1, 2]);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockItems);
    });

    it('should filter out null items', async () => {
      const mockItem: HackerNewsItem = {
        id: 1,
        type: 'story',
        by: 'user1',
        time: 1640995200,
        title: 'Story 1'
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockItem })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await hackerNewsApi.getItems([1, 2]);

      expect(result).toEqual([mockItem]);
    });
  });

  describe('getStoriesWithDetails', () => {
    it('should fetch top stories with details', async () => {
      const mockStoryIds = [1, 2, 3];
      const mockStories: HackerNewsItem[] = [
        { id: 1, type: 'story', by: 'user1', time: 1640995200, title: 'Story 1' },
        { id: 2, type: 'story', by: 'user2', time: 1640995300, title: 'Story 2' },
        { id: 3, type: 'story', by: 'user3', time: 1640995400, title: 'Story 3' }
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockStoryIds })
        .mockResolvedValueOnce({ data: mockStories[0] })
        .mockResolvedValueOnce({ data: mockStories[1] })
        .mockResolvedValueOnce({ data: mockStories[2] });

      const result = await hackerNewsApi.getStoriesWithDetails(3);

      expect(result).toEqual(mockStories);
    });
  });
});