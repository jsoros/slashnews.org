// Shared UI type definitions for components

export type ViewMode = 'title' | 'compact' | 'full';

export type SortMode = 'default' | 'comments';

// Base interface for components that need view mode
export interface ViewModeProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Base interface for components that need sort mode
export interface SortModeProps {
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

// Combined interface for components that need both
export interface ViewAndSortModeProps extends ViewModeProps, SortModeProps {}

// Category-related types
export type CategoryType = 'top' | 'new' | 'best';

export interface CategoryProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}