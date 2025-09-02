import { useReducer, useCallback } from 'react';

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
  | { type: 'TOGGLE_STORY_EXPANSION'; storyId: number }
  | { type: 'SET_VISIBLE_STORIES'; storyIds: number[] }
  | { type: 'ADD_VISIBLE_STORY'; storyId: number }
  | { type: 'CLEAR_VISIBLE_STORIES' }
  | { type: 'SELECT_STORY'; storyId: number | null }
  | { type: 'CLEAR_ALL_STATE' }
  | { type: 'RESET_SUMMARIES' };

// Initial state
const initialState: StoryListState = {
  summaries: new Map(),
  loadingSummaries: new Set(),
  failedSummaries: new Set(),
  expandedStory: null,
  visibleStories: new Set(),
  selectedStory: null,
};

// Reducer function with optimized state updates
function storyListReducer(state: StoryListState, action: StoryListAction): StoryListState {
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

    case 'TOGGLE_STORY_EXPANSION': {
      return {
        ...state,
        expandedStory: state.expandedStory === action.storyId ? null : action.storyId,
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

// Custom hook for StoryList state management
export function useStoryListState() {
  const [state, dispatch] = useReducer(storyListReducer, initialState);

  // Action creators for better API
  const actions = {
    startSummaryLoading: useCallback((storyId: number) => {
      dispatch({ type: 'SUMMARY_LOADING', storyId });
    }, []),

    setSummarySuccess: useCallback((storyId: number, summary: string) => {
      dispatch({ type: 'SUMMARY_SUCCESS', storyId, summary });
    }, []),

    setSummaryFailed: useCallback((storyId: number) => {
      dispatch({ type: 'SUMMARY_FAILED', storyId });
    }, []),

    toggleStoryExpansion: useCallback((storyId: number) => {
      dispatch({ type: 'TOGGLE_STORY_EXPANSION', storyId });
    }, []),

    setVisibleStories: useCallback((storyIds: number[]) => {
      dispatch({ type: 'SET_VISIBLE_STORIES', storyIds });
    }, []),

    addVisibleStory: useCallback((storyId: number) => {
      dispatch({ type: 'ADD_VISIBLE_STORY', storyId });
    }, []),

    clearVisibleStories: useCallback(() => {
      dispatch({ type: 'CLEAR_VISIBLE_STORIES' });
    }, []),

    selectStory: useCallback((storyId: number | null) => {
      dispatch({ type: 'SELECT_STORY', storyId });
    }, []),

    clearAllState: useCallback(() => {
      dispatch({ type: 'CLEAR_ALL_STATE' });
    }, []),

    resetSummaries: useCallback(() => {
      dispatch({ type: 'RESET_SUMMARIES' });
    }, []),
  };

  // Computed values for better performance
  const computed = {
    hasSummary: useCallback((storyId: number) => state.summaries.has(storyId), [state.summaries]),
    
    getSummary: useCallback((storyId: number) => state.summaries.get(storyId), [state.summaries]),
    
    isLoadingSummary: useCallback((storyId: number) => state.loadingSummaries.has(storyId), [state.loadingSummaries]),
    
    isSummaryFailed: useCallback((storyId: number) => state.failedSummaries.has(storyId), [state.failedSummaries]),
    
    isVisible: useCallback((storyId: number) => state.visibleStories.has(storyId), [state.visibleStories]),
    
    isExpanded: useCallback((storyId: number) => state.expandedStory === storyId, [state.expandedStory]),
    
    isSelected: useCallback((storyId: number) => state.selectedStory === storyId, [state.selectedStory]),

    // Batch operations for efficiency
    shouldLoadSummary: useCallback((storyId: number, hasUrl: boolean) => {
      return hasUrl && 
             !state.summaries.has(storyId) && 
             !state.loadingSummaries.has(storyId) && 
             !state.failedSummaries.has(storyId);
    }, [state.summaries, state.loadingSummaries, state.failedSummaries]),

    getLoadableSummaries: useCallback((storyIds: number[], hasUrl: (id: number) => boolean) => {
      return storyIds.filter(storyId => 
        hasUrl(storyId) &&
        state.visibleStories.has(storyId) &&
        !state.summaries.has(storyId) && 
        !state.loadingSummaries.has(storyId) && 
        !state.failedSummaries.has(storyId)
      );
    }, [state.summaries, state.loadingSummaries, state.failedSummaries, state.visibleStories]),
  };

  // Statistics for debugging and monitoring
  const stats = {
    summariesCount: state.summaries.size,
    loadingSummariesCount: state.loadingSummaries.size,
    failedSummariesCount: state.failedSummaries.size,
    visibleStoriesCount: state.visibleStories.size,
    expandedStory: state.expandedStory,
    selectedStory: state.selectedStory,
  };

  return {
    state,
    actions,
    computed,
    stats,
  };
}

// Type exports for external use
export type StoryListStateHook = ReturnType<typeof useStoryListState>;