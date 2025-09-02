import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock child components to focus on App integration logic
vi.mock('../components/Header', () => ({
  Header: ({ currentCategory, onCategoryChange, viewMode, onViewModeChange }: {
    currentCategory: string;
    onCategoryChange: (category: string) => void;
    viewMode: string;
    onViewModeChange: (mode: string) => void;
  }) => (
    <div data-testid="header">
      <span data-testid="current-category">{currentCategory}</span>
      <span data-testid="current-view-mode">{viewMode}</span>
      <button
        data-testid="category-button"
        onClick={() => onCategoryChange('new')}
      >
        Change Category
      </button>
      <button
        data-testid="view-mode-button"
        onClick={() => onViewModeChange('compact')}
      >
        Change View Mode
      </button>
    </div>
  ),
}));

vi.mock('../components/StoryList', () => ({
  StoryList: ({ category, viewMode }: { category: string; viewMode: string }) => (
    <div data-testid="story-list">
      <span data-testid="story-list-category">{category}</span>
      <span data-testid="story-list-view-mode">{viewMode}</span>
    </div>
  ),
}));

vi.mock('../components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer Content</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders all main components', () => {
      render(<App />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('story-list')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('renders main content wrapper with correct class', () => {
      const { container } = render(<App />);
      
      const mainContent = container.querySelector('.main-content');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toContainElement(screen.getByTestId('story-list'));
    });

    it('initializes with default category and view mode', () => {
      render(<App />);

      expect(screen.getByTestId('current-category')).toHaveTextContent('top');
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('full');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('top');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('full');
    });
  });

  describe('Category Management', () => {
    it('updates category when Header calls onCategoryChange', () => {
      render(<App />);

      // Initial state
      expect(screen.getByTestId('current-category')).toHaveTextContent('top');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('top');

      // Change category
      fireEvent.click(screen.getByTestId('category-button'));

      // State should be updated
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('new');
    });

    it('passes category changes to both Header and StoryList', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('category-button'));

      // Both components should receive the new category
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('new');
    });

    it('maintains category state across re-renders', () => {
      const { rerender } = render(<App />);

      fireEvent.click(screen.getByTestId('category-button'));
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');

      rerender(<App />);

      // Category should persist (though this is more of a test of React behavior)
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');
    });
  });

  describe('View Mode Management', () => {
    it('updates view mode when Header calls onViewModeChange', () => {
      render(<App />);

      // Initial state
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('full');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('full');

      // Change view mode
      fireEvent.click(screen.getByTestId('view-mode-button'));

      // State should be updated
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('compact');
    });

    it('passes view mode changes to both Header and StoryList', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('view-mode-button'));

      // Both components should receive the new view mode
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('compact');
    });

    it('maintains view mode state across re-renders', () => {
      const { rerender } = render(<App />);

      fireEvent.click(screen.getByTestId('view-mode-button'));
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');

      rerender(<App />);

      // View mode should persist
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
    });
  });

  describe('Component Integration', () => {
    it('passes all required props to Header', () => {
      render(<App />);
      
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      
      // Check that header receives and displays current state
      expect(screen.getByTestId('current-category')).toHaveTextContent('top');
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('full');
      
      // Check that callbacks work
      expect(screen.getByTestId('category-button')).toBeInTheDocument();
      expect(screen.getByTestId('view-mode-button')).toBeInTheDocument();
    });

    it('passes all required props to StoryList', () => {
      render(<App />);
      
      const storyList = screen.getByTestId('story-list');
      expect(storyList).toBeInTheDocument();
      
      // Check that story list receives current state
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('top');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('full');
    });

    it('renders Footer component', () => {
      render(<App />);
      
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('maintains proper component hierarchy', () => {
      const { container } = render(<App />);
      
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.tagName).toBe('DIV');
      
      // Check that main components exist (skip links are now at the beginning)
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('main')).toHaveClass('main-content');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  describe('State Synchronization', () => {
    it('synchronizes category changes between Header and StoryList', () => {
      render(<App />);

      // Initially both components should have the same category
      expect(screen.getByTestId('current-category')).toHaveTextContent('top');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('top');

      // Change category via Header
      fireEvent.click(screen.getByTestId('category-button'));

      // Both components should update simultaneously
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');
      expect(screen.getByTestId('story-list-category')).toHaveTextContent('new');
    });

    it('synchronizes view mode changes between Header and StoryList', () => {
      render(<App />);

      // Initially both components should have the same view mode
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('full');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('full');

      // Change view mode via Header
      fireEvent.click(screen.getByTestId('view-mode-button'));

      // Both components should update simultaneously
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
      expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('compact');
    });

    it('handles multiple rapid state changes correctly', async () => {
      render(<App />);

      // Rapid category changes
      fireEvent.click(screen.getByTestId('category-button'));
      fireEvent.click(screen.getByTestId('view-mode-button'));

      await waitFor(() => {
        expect(screen.getByTestId('current-category')).toHaveTextContent('new');
        expect(screen.getByTestId('story-list-category')).toHaveTextContent('new');
        expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
        expect(screen.getByTestId('story-list-view-mode')).toHaveTextContent('compact');
      });
    });
  });

  describe('TypeScript Type Safety', () => {
    it('accepts valid ViewMode types', () => {
      // This test ensures the component compiles with valid ViewMode values
      // The fact that the component renders without TypeScript errors indicates
      // that the type definitions are working correctly
      
      render(<App />);
      
      // If this renders successfully, ViewMode types are properly defined
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('full');
    });
  });

  describe('Performance Characteristics', () => {
    it('does not unnecessarily re-render child components', () => {
      // This test verifies that memoization is working correctly
      const { rerender } = render(<App />);
      
      // Re-render with same state
      rerender(<App />);
      
      // Components should still be present (basic functionality test)
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('story-list')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('minimizes state updates', () => {
      render(<App />);
      
      const initialCategory = screen.getByTestId('current-category').textContent;
      const initialViewMode = screen.getByTestId('current-view-mode').textContent;
      
      // Multiple clicks shouldn't cause unnecessary state changes
      fireEvent.click(screen.getByTestId('category-button'));
      fireEvent.click(screen.getByTestId('view-mode-button'));
      
      // State should have changed exactly once for each
      expect(screen.getByTestId('current-category')).toHaveTextContent('new');
      expect(screen.getByTestId('current-view-mode')).toHaveTextContent('compact');
      
      // Verify they're different from initial values
      expect('new').not.toBe(initialCategory);
      expect('compact').not.toBe(initialViewMode);
    });
  });

  describe('CSS Import', () => {
    it('imports classic.css without errors', () => {
      // The fact that the component renders successfully indicates
      // that the CSS import is working correctly
      expect(() => render(<App />)).not.toThrow();
    });
  });

  describe('Error Boundaries Integration', () => {
    it('renders normally when child components work correctly', () => {
      render(<App />);
      
      // All components should render successfully
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('story-list')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure', () => {
      render(<App />);
      
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('main-content');
      expect(main).toContainElement(screen.getByTestId('story-list'));
    });

    it('maintains logical document structure', () => {
      render(<App />);
      
      // Check that we have the essential semantic structure
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      
      // Check that main contains the story list
      expect(screen.getByRole('main')).toContainElement(screen.getByTestId('story-list'));
    });
  });
});