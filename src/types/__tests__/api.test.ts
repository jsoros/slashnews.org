import { describe, it, expect } from 'vitest';
import {
  validateStoryId,
  validateUrl,
  validateHackerNewsItem,
  APIError
} from '../api';

describe('API Validation Functions', () => {

  describe('validateStoryId', () => {
    it('should return the id if it is a positive integer', () => {
      expect(validateStoryId(1)).toBe(1);
      expect(validateStoryId(100)).toBe(100);
      expect(validateStoryId(999999)).toBe(999999);
    });

    it('should throw an error for non-number inputs', () => {
      expect(() => validateStoryId('1')).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(null)).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(undefined)).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId({})).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId([])).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(NaN)).toThrowError('Story ID must be a positive integer');
    });

    it('should throw an error for numbers <= 0', () => {
      expect(() => validateStoryId(0)).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(-1)).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(-100)).toThrowError('Story ID must be a positive integer');
    });

    it('should throw an error for non-integer numbers', () => {
      expect(() => validateStoryId(1.5)).toThrowError('Story ID must be a positive integer');
      expect(() => validateStoryId(3.14159)).toThrowError('Story ID must be a positive integer');
    });
  });

  describe('validateUrl', () => {
    it('should return the url if it is valid and uses http/https', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com');
      expect(validateUrl('https://example.com/path?query=1')).toBe('https://example.com/path?query=1');
    });

    it('should throw an error for non-string or empty inputs', () => {
      expect(() => validateUrl(null)).toThrowError('URL must be a non-empty string');
      expect(() => validateUrl(undefined)).toThrowError('URL must be a non-empty string');
      expect(() => validateUrl(123)).toThrowError('URL must be a non-empty string');
      expect(() => validateUrl('')).toThrowError('URL must be a non-empty string');
      expect(() => validateUrl('   ')).toThrowError('URL must be a non-empty string');
    });

    it('should throw an error for invalid URLs', () => {
      expect(() => validateUrl('not-a-url')).toThrowError('URL must be valid');
      expect(() => validateUrl('http://')).toThrowError('URL must be valid');
    });

    it('should throw an error for non-http/https protocols', () => {
      expect(() => validateUrl('ftp://example.com')).toThrowError('URL must use HTTP or HTTPS protocol');
      expect(() => validateUrl('javascript:alert("xss")')).toThrowError('URL must use HTTP or HTTPS protocol');
      expect(() => validateUrl('file:///etc/passwd')).toThrowError('URL must use HTTP or HTTPS protocol');
      expect(() => validateUrl('mailto:test@example.com')).toThrowError('URL must use HTTP or HTTPS protocol');
    });
  });

  describe('validateHackerNewsItem', () => {
    it('should return the item for a valid story', () => {
      const validStory = {
        id: 1,
        type: 'story',
        time: 1234567890,
        title: 'A Valid Story'
      };
      expect(validateHackerNewsItem(validStory)).toEqual(validStory);
    });

    it('should return the item for a valid comment', () => {
      const validComment = {
        id: 2,
        type: 'comment',
        time: 1234567890,
        text: 'This is a comment',
        parent: 1
      };
      expect(validateHackerNewsItem(validComment)).toEqual(validComment);
    });

    it('should return the item for a valid job', () => {
      const validJob = {
        id: 3,
        type: 'job',
        time: 1234567890,
        title: 'We are hiring'
      };
      expect(validateHackerNewsItem(validJob)).toEqual(validJob);
    });

    it('should throw an error if item is not an object', () => {
      expect(() => validateHackerNewsItem(null)).toThrowError('Item must be an object');
      expect(() => validateHackerNewsItem(undefined)).toThrowError('Item must be an object');
      expect(() => validateHackerNewsItem('string')).toThrowError('Item must be an object');
      expect(() => validateHackerNewsItem(123)).toThrowError('Item must be an object');
    });

    it('should throw an error if item has missing or invalid ID', () => {
      const missingId = { type: 'story', time: 123, title: 'Title' };
      expect(() => validateHackerNewsItem(missingId)).toThrowError('Item must have a valid ID');

      const invalidId = { id: 0, type: 'story', time: 123, title: 'Title' };
      expect(() => validateHackerNewsItem(invalidId)).toThrowError('Item must have a valid ID');

      const stringId = { id: '1', type: 'story', time: 123, title: 'Title' };
      expect(() => validateHackerNewsItem(stringId)).toThrowError('Item must have a valid ID');
    });

    it('should throw an error if item has missing or invalid type', () => {
      const missingType = { id: 1, time: 123, title: 'Title' };
      expect(() => validateHackerNewsItem(missingType)).toThrowError('Item must have a valid type');

      const invalidType = { id: 1, type: 'unknown', time: 123, title: 'Title' };
      expect(() => validateHackerNewsItem(invalidType)).toThrowError('Item must have a valid type');
    });

    it('should throw an error if item has missing or invalid timestamp', () => {
      const missingTime = { id: 1, type: 'story', title: 'Title' };
      expect(() => validateHackerNewsItem(missingTime)).toThrowError('Item must have a valid timestamp');

      const invalidTime = { id: 1, type: 'story', time: 0, title: 'Title' };
      expect(() => validateHackerNewsItem(invalidTime)).toThrowError('Item must have a valid timestamp');

      const stringTime = { id: 1, type: 'story', time: '123', title: 'Title' };
      expect(() => validateHackerNewsItem(stringTime)).toThrowError('Item must have a valid timestamp');
    });

    it('should throw an error if a story is missing a title', () => {
      const missingTitle = { id: 1, type: 'story', time: 123 };
      expect(() => validateHackerNewsItem(missingTitle)).toThrowError('Story must have a title');
    });

    it('should throw an error if a comment is missing text or parent', () => {
      const missingText = { id: 2, type: 'comment', time: 123, parent: 1 };
      expect(() => validateHackerNewsItem(missingText)).toThrowError('Comment must have text and parent');

      const missingParent = { id: 2, type: 'comment', time: 123, text: 'Hello' };
      expect(() => validateHackerNewsItem(missingParent)).toThrowError('Comment must have text and parent');
    });
  });
});
