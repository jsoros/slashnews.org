// State interface for StoryList
export interface StoryListState {
  summaries: Map<number, string>;
  loadingSummaries: Set<number>;
  failedSummaries: Set<number>;
  expandedStory: number | null;
  visibleStories: Set<number>;
  selectedStory: number | null;
}

// Action types
export type StoryListAction =
  | { type: 'SUMMARY_LOADING'; storyId: number }
  | { type: 'SUMMARY_SUCCESS'; storyId: number; summary: string }
  | { type: 'SUMMARY_FAILED'; storyId: number }
  | { type: 'CLEAR_SUMMARY_FAILED'; storyId: number }
  | { type: 'TOGGLE_STORY_EXPANSION'; storyId: number }
  | { type: 'SET_VISIBLE_STORIES'; storyIds: number[] }
  | { type: 'ADD_VISIBLE_STORY'; storyId: number }
  | { type: 'CLEAR_VISIBLE_STORIES' }
  | { type: 'SELECT_STORY'; storyId: number | null }
  | { type: 'CLEAR_ALL_STATE' }
  | { type: 'RESET_SUMMARIES' };

// Initial state
export const initialState: StoryListState = {
  summaries: new Map(),
  loadingSummaries: new Set(),
  failedSummaries: new Set(),
  expandedStory: null,
  visibleStories: new Set(),
  selectedStory: null,
};

// Reducer function with optimized state updates
export function storyListReducer(state: StoryListState, action: StoryListAction): StoryListState {
  switch (action.type) {
    case 'SUMMARY_LOADING': {
      const newLoadingSummaries = new Set(state.loadingSummaries);
      const newFailedSummaries = new Set(state.failedSummaries);

      newLoadingSummaries.add(action.storyId);
      newFailedSummaries.delete(action.storyId); // Remove from failed if retrying

      return {
        ...state,
        loadingSummaries: newLoadingSummaries,
        failedSummaries: newFailedSummaries,
      };
    }

    case 'SUMMARY_SUCCESS': {
      const newSummaries = new Map(state.summaries);
      const newLoadingSummaries = new Set(state.loadingSummaries);

      newSummaries.set(action.storyId, action.summary);
      newLoadingSummaries.delete(action.storyId);

      return {
        ...state,
        summaries: newSummaries,
        loadingSummaries: newLoadingSummaries,
      };
    }

    case 'SUMMARY_FAILED': {
      const newLoadingSummaries = new Set(state.loadingSummaries);
      const newFailedSummaries = new Set(state.failedSummaries);

      newLoadingSummaries.delete(action.storyId);
      newFailedSummaries.add(action.storyId);

      return {
        ...state,
        loadingSummaries: newLoadingSummaries,
        failedSummaries: newFailedSummaries,
      };
    }

    case 'CLEAR_SUMMARY_FAILED': {
      const newFailedSummaries = new Set(state.failedSummaries);
      newFailedSummaries.delete(action.storyId);

      return {
        ...state,
        failedSummaries: newFailedSummaries,
      };
    }

    case 'TOGGLE_STORY_EXPANSION': {
      const newExpandedStory = state.expandedStory === action.storyId ? null : action.storyId;
      return {
        ...state,
        expandedStory: newExpandedStory,
      };
    }

    case 'SET_VISIBLE_STORIES': {
      return {
        ...state,
        visibleStories: new Set(action.storyIds),
      };
    }

    case 'ADD_VISIBLE_STORY': {
      if (state.visibleStories.has(action.storyId)) {
        return state; // No change if already visible
      }

      const newVisibleStories = new Set(state.visibleStories);
      newVisibleStories.add(action.storyId);

      return {
        ...state,
        visibleStories: newVisibleStories,
      };
    }

    case 'CLEAR_VISIBLE_STORIES': {
      return {
        ...state,
        visibleStories: new Set(),
      };
    }

    case 'SELECT_STORY': {
      return {
        ...state,
        selectedStory: action.storyId,
      };
    }

    case 'CLEAR_ALL_STATE': {
      return {
        ...initialState,
        summaries: new Map(), // Create new instances
        loadingSummaries: new Set(),
        failedSummaries: new Set(),
        visibleStories: new Set(),
      };
    }

    case 'RESET_SUMMARIES': {
      return {
        ...state,
        summaries: new Map(),
        loadingSummaries: new Set(),
        failedSummaries: new Set(),
      };
    }

    default:
      return state;
  }
}
