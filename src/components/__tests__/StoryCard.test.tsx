import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryCard } from '../StoryCard';
import type { HackerNewsItem } from '../../services/hackerNewsApi';
import DOMPurify from 'dompurify';

const mockOnToggleComments = vi.fn();
const mockOnHideArticle = vi.fn();
const mockOnShowArticle = vi.fn();

// Use actual DOMPurify to test sanitization
// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

describe('StoryCard', () => {
  const mockStory: HackerNewsItem = {
    id: 123,
    deleted: false,
    type: 'story',
    by: 'testuser',
    time: 1609459200,
    dead: false,
    kids: [124, 125],
    title: 'Test Story Title',
    url: 'https://example.com/test-article',
    score: 100,
    descendants: 25,
    text: undefined,
  };

  const defaultProps = {
    story: mockStory,
    viewMode: 'title' as const,
    expandedStory: null,
    onToggleComments: mockOnToggleComments,
    onHideArticle: mockOnHideArticle,
    onShowArticle: mockOnShowArticle,
    isHidden: false,
    showingHidden: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders story title', () => {
    render(<StoryCard {...defaultProps} />);
    expect(screen.getByText('Test Story Title')).toBeInTheDocument();
  });

  it('renders in compact view mode', () => {
    render(<StoryCard {...defaultProps} viewMode="compact" />);
    expect(screen.getByText('Test Story Title')).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
  });

  it('renders in full view mode', () => {
    render(<StoryCard {...defaultProps} viewMode="full" />);
    expect(screen.getByText(/Test Story Title/)).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
    expect(screen.getByText('25 comments')).toBeInTheDocument();
  });

  it('renders safe url when given a javascript protocol url', () => {
    const maliciousStory = {
      ...mockStory,
      url: 'javascript:alert(1)',
    };
    render(<StoryCard {...defaultProps} story={maliciousStory} viewMode="title" />);

    // In title view, the link wraps the title
    const link = screen.getByRole('link', { name: 'Test Story Title' });
    expect(link).toHaveAttribute('href', 'about:blank');
  });

  describe('HTML Sanitization', () => {
    it('removes DOMPurify hook even if sanitization throws an error', () => {
      // Instead of relying on React rendering and dealing with unhandled exceptions,
      // we can extract the sanitized function behavior by importing and calling it
      // or in this case, since we can't easily extract it without changing code,
      // we can render with an ErrorBoundary to catch the rendering error.
      //
      // Update: React error boundary still bubbles up unhandled exceptions in test.
      // So let's mock sanitize to NOT throw, but let's test a standalone extraction of the function
      // Wait, we can just test if try/finally logic is intact by examining the code directly,
      // or since we just need coverage we can just let DOMPurify handle it or mock the DOMPurify
      // object differently.
      // Actually we can just do a very simple thing:
      // render and expect it to throw but use a different technique.

      const originalSanitize = DOMPurify.sanitize;
      const removeHookSpy = vi.spyOn(DOMPurify, 'removeHook');

      vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
        throw new Error('Sanitization failed');
      });

      // Suppress console.error from React
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Vitest's unhandled rejection / uncaught exception handler might fail the test
      // To work around this, we can just intercept the global error event in jsdom
      const errorListener = (e: ErrorEvent) => e.preventDefault();
      window.addEventListener('error', errorListener);

      try {
        render(<StoryCard {...defaultProps} story={{...mockStory, text: 'text'}} viewMode="full" />);
      } catch {
        // Ignored
      }

      expect(removeHookSpy).toHaveBeenCalledWith('afterSanitizeAttributes');

      window.removeEventListener('error', errorListener);
      consoleErrorSpy.mockRestore();
      vi.spyOn(DOMPurify, 'sanitize').mockImplementation(originalSanitize);
      removeHookSpy.mockRestore();
    });

    it('sanitizes dangerous HTML payloads', () => {
      const maliciousStory = {
        ...mockStory,
        text: 'Hello <script>alert("xss")</script><img src="x" onerror="alert(1)">World',
      };

      const { container } = render(
        <StoryCard {...defaultProps} story={maliciousStory} viewMode="full" />
      );

      const summaryElement = container.querySelector('.story-summary');
      expect(summaryElement).not.toBeNull();
      // Should strip script and img tags but keep text
      expect(summaryElement?.innerHTML).toBe('Hello World');
    });

    it('allows permitted tags and adds target/rel to links', () => {
      const safeStory = {
        ...mockStory,
        text: 'Check this <a href="https://example.com">link</a> and <code>code</code><br><p>paragraph</p>',
      };

      const { container } = render(
        <StoryCard {...defaultProps} story={safeStory} viewMode="full" />
      );

      const summaryElement = container.querySelector('.story-summary');
      expect(summaryElement).not.toBeNull();

      // Should preserve a, code, br, p tags
      expect(summaryElement?.querySelector('code')).toBeInTheDocument();
      expect(summaryElement?.querySelector('br')).toBeInTheDocument();
      expect(summaryElement?.querySelector('p')).toBeInTheDocument();

      // Link should have added attributes
      const link = summaryElement?.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });
});