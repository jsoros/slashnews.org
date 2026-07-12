import { useReducer, useMemo } from 'react';
import { storyListReducer, initialState } from '../reducers/storyListReducer';

// Custom hook for StoryList state management
export function useStoryListState() {
  const [state, dispatch] = useReducer(storyListReducer, initialState);

  // Action creators for better API
  const actions = useMemo(() => ({
    startSummaryLoading: (storyId: number) => {
      dispatch({ type: 'SUMMARY_LOADING', storyId });
    },

    setSummarySuccess: (storyId: number, summary: string) => {
      dispatch({ type: 'SUMMARY_SUCCESS', storyId, summary });
    },

    setSummaryFailed: (storyId: number) => {
      dispatch({ type: 'SUMMARY_FAILED', storyId });
    },

    clearSummaryFailed: (storyId: number) => {
      dispatch({ type: 'CLEAR_SUMMARY_FAILED', storyId });
    },

    toggleStoryExpansion: (storyId: number) => {
      dispatch({ type: 'TOGGLE_STORY_EXPANSION', storyId });
    },

    setVisibleStories: (storyIds: number[]) => {
      dispatch({ type: 'SET_VISIBLE_STORIES', storyIds });
    },

    addVisibleStory: (storyId: number) => {
      dispatch({ type: 'ADD_VISIBLE_STORY', storyId });
    },

    clearVisibleStories: () => {
      dispatch({ type: 'CLEAR_VISIBLE_STORIES' });
    },

    selectStory: (storyId: number | null) => {
      dispatch({ type: 'SELECT_STORY', storyId });
    },

    clearAllState: () => {
      dispatch({ type: 'CLEAR_ALL_STATE' });
    },

    resetSummaries: () => {
      dispatch({ type: 'RESET_SUMMARIES' });
    },
  }), [dispatch]);

  return {
    state,
    actions,
  };
}

// Type exports for external use
export type StoryListStateHook = ReturnType<typeof useStoryListState>;
