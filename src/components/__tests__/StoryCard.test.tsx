import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryCard } from '../StoryCard';
import type { HackerNewsItem } from '../../services/hackerNewsApi';

const mockOnToggleComments = vi.fn();
const mockOnHideArticle = vi.fn();
const mockOnShowArticle = vi.fn();

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

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
    expect(screen.getByText('100 pts')).toBeInTheDocument();
  });

  it('renders in full view mode', () => {
    render(<StoryCard {...defaultProps} viewMode="full" />);
    expect(screen.getByText(/Test Story Title/)).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
    expect(screen.getByText('25 comments')).toBeInTheDocument();
  });
});