import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

const defaultProps = {
  currentCategory: 'top' as const,
  onCategoryChange: vi.fn(),
  viewMode: 'full' as const,
  onViewModeChange: vi.fn(),
  showAbout: false,
  onShowAbout: vi.fn(),
  showHiddenArticles: false,
  onToggleHiddenArticles: vi.fn(),
  onClearHiddenArticles: vi.fn(),
};

describe('Header', () => {
  it('should render the header with title and tagline', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Hacker News • Classic Style')).toBeInTheDocument();
    expect(screen.getByText('News for Nerds, Stuff that Matters (via HackerNews API)')).toBeInTheDocument();
  });

  it('should render navigation with all categories', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Top Stories')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
  });

  it('should highlight the current category', () => {
    render(<Header {...defaultProps} currentCategory="new" />);
    
    const newLink = screen.getByText('New');
    expect(newLink).toHaveClass('active');
    
    const topLink = screen.getByText('Top Stories');
    expect(topLink).not.toHaveClass('active');
  });

  it('should call onCategoryChange when a category is clicked', () => {
    const mockOnCategoryChange = vi.fn();
    render(<Header {...defaultProps} onCategoryChange={mockOnCategoryChange} />);

    fireEvent.click(screen.getByText('New'));
    expect(mockOnCategoryChange).toHaveBeenCalledWith('new');

    fireEvent.click(screen.getByText('Best'));
    expect(mockOnCategoryChange).toHaveBeenCalledWith('best');
  });

  it('should render external links', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Original HN')).toHaveAttribute('href', 'https://news.ycombinator.com/');
    expect(screen.getByText('HN API')).toHaveAttribute('href', 'https://github.com/HackerNews/API');
  });
});