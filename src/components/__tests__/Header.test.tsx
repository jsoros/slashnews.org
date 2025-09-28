import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

const defaultProps = {
  currentCategory: 'top' as const,
  onCategoryChange: vi.fn(),
  viewMode: 'full' as const,
  onViewModeChange: vi.fn(),
  sortMode: 'default' as const,
  onSortModeChange: vi.fn(),
  showAbout: false,
  onShowAbout: vi.fn(),
  showHiddenArticles: false,
  onToggleHiddenArticles: vi.fn(),
  onClearHiddenArticles: vi.fn(),
};

describe('Header', () => {
  it('should render the header with title', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Hacker News • Classic Style')).toBeInTheDocument();
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

  describe('Dropdown Functionality', () => {
    it('should render gear button for dropdown', () => {
      render(<Header {...defaultProps} />);

      const gearButton = screen.getByLabelText('View Options');
      expect(gearButton).toBeInTheDocument();
      expect(gearButton).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should show dropdown when gear button is clicked', () => {
      render(<Header {...defaultProps} />);

      const gearButton = screen.getByLabelText('View Options');

      // Initially dropdown should not be visible
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click gear button
      fireEvent.click(gearButton);

      // Dropdown should now be visible
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should hide dropdown when clicking away', () => {
      render(<Header {...defaultProps} />);

      const gearButton = screen.getByLabelText('View Options');

      // Open dropdown
      fireEvent.click(gearButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click gear button again to close
      fireEvent.click(gearButton);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('View Mode Options', () => {
    it('should display all view mode options in dropdown', () => {
      render(<Header {...defaultProps} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Check all view mode options are present
      expect(screen.getByText('Title View')).toBeInTheDocument();
      expect(screen.getByText('Compact View')).toBeInTheDocument();
      expect(screen.getByText('Full View')).toBeInTheDocument();
    });

    it('should highlight current view mode as active', () => {
      render(<Header {...defaultProps} viewMode="compact" />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Current view mode should have active class
      const compactButton = screen.getByText('Compact View').closest('button');
      expect(compactButton).toHaveClass('active');

      // Other modes should not
      const titleButton = screen.getByText('Title View').closest('button');
      expect(titleButton).not.toHaveClass('active');
    });

    it('should call onViewModeChange when view mode is selected', () => {
      const mockOnViewModeChange = vi.fn();
      render(<Header {...defaultProps} onViewModeChange={mockOnViewModeChange} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Click a view mode option
      fireEvent.click(screen.getByText('Compact View'));

      expect(mockOnViewModeChange).toHaveBeenCalledWith('compact');
    });
  });

  describe('Sort Mode Options', () => {
    it('should display all sort mode options in dropdown', () => {
      render(<Header {...defaultProps} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Check sort mode options are present
      expect(screen.getByText('Default Order')).toBeInTheDocument();
      expect(screen.getByText('Sort by Comments')).toBeInTheDocument();
    });

    it('should highlight current sort mode as active', () => {
      render(<Header {...defaultProps} sortMode="comments" />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Current sort mode should have active class
      const commentsButton = screen.getByText('Sort by Comments').closest('button');
      expect(commentsButton).toHaveClass('active');

      // Other mode should not
      const defaultButton = screen.getByText('Default Order').closest('button');
      expect(defaultButton).not.toHaveClass('active');
    });

    it('should call onSortModeChange when sort mode is selected', () => {
      const mockOnSortModeChange = vi.fn();
      render(<Header {...defaultProps} onSortModeChange={mockOnSortModeChange} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Click sort by comments option
      fireEvent.click(screen.getByText('Sort by Comments'));

      expect(mockOnSortModeChange).toHaveBeenCalledWith('comments');
    });

    it('should close dropdown after selecting sort mode', () => {
      render(<Header {...defaultProps} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click sort option
      fireEvent.click(screen.getByText('Sort by Comments'));

      // Dropdown should close
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Hidden Articles Options', () => {
    it('should display hidden articles toggle in dropdown', () => {
      render(<Header {...defaultProps} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      expect(screen.getByText('Show Hidden Articles')).toBeInTheDocument();
      expect(screen.getByText('Clear All Hidden Articles')).toBeInTheDocument();
    });

    it('should highlight show hidden articles when active', () => {
      render(<Header {...defaultProps} showHiddenArticles={true} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      const hiddenButton = screen.getByText('Show Hidden Articles').closest('button');
      expect(hiddenButton).toHaveClass('active');
    });

    it('should call onToggleHiddenArticles when toggle is clicked', () => {
      const mockOnToggleHiddenArticles = vi.fn();
      render(<Header {...defaultProps} onToggleHiddenArticles={mockOnToggleHiddenArticles} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Click toggle
      fireEvent.click(screen.getByText('Show Hidden Articles'));

      expect(mockOnToggleHiddenArticles).toHaveBeenCalled();
    });

    it('should call onClearHiddenArticles when clear is clicked', () => {
      const mockOnClearHiddenArticles = vi.fn();
      render(<Header {...defaultProps} onClearHiddenArticles={mockOnClearHiddenArticles} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Click clear
      fireEvent.click(screen.getByText('Clear All Hidden Articles'));

      expect(mockOnClearHiddenArticles).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dropdown', () => {
      render(<Header {...defaultProps} />);

      const gearButton = screen.getByLabelText('View Options');
      expect(gearButton).toHaveAttribute('aria-haspopup', 'menu');
      expect(gearButton).toHaveAttribute('aria-expanded', 'false');

      // Open dropdown
      fireEvent.click(gearButton);
      expect(gearButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper menu item roles', () => {
      render(<Header {...defaultProps} />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Check menu structure
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      // Check menu items have proper roles
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it('should have aria-checked attributes for active states', () => {
      render(<Header {...defaultProps} viewMode="compact" sortMode="comments" />);

      // Open dropdown
      const gearButton = screen.getByLabelText('View Options');
      fireEvent.click(gearButton);

      // Check active view mode has aria-checked="true"
      const compactButton = screen.getByText('Compact View').closest('button');
      expect(compactButton).toHaveAttribute('aria-checked', 'true');

      // Check active sort mode has aria-checked="true"
      const commentsButton = screen.getByText('Sort by Comments').closest('button');
      expect(commentsButton).toHaveAttribute('aria-checked', 'true');
    });
  });
});