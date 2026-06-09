import { useState, useEffect, useCallback } from 'react';

export const STORAGE_KEY = 'hiddenArticles';

export const useHiddenArticles = () => {
  const [hiddenArticles, setHiddenArticles] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn('Failed to load hidden articles:', error);
    }
    return new Set();
  });

  const updateLocalStorage = useCallback((articles: Set<number>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(articles)));
    } catch (error) {
      console.warn('Failed to save hidden articles:', error);
    }
  }, []);

  useEffect(() => {
    updateLocalStorage(hiddenArticles);
  }, [hiddenArticles, updateLocalStorage]);

  const hideArticle = useCallback((articleId: number) => {
    setHiddenArticles(prev => {
      const newSet = new Set(prev);
      newSet.add(articleId);
      return newSet;
    });
  }, []);

  const showArticle = useCallback((articleId: number) => {
    setHiddenArticles(prev => {
      const newSet = new Set(prev);
      newSet.delete(articleId);
      return newSet;
    });
  }, []);

  const isArticleHidden = useCallback((articleId: number) => {
    return hiddenArticles.has(articleId);
  }, [hiddenArticles]);

  const clearAllHidden = useCallback(() => {
    setHiddenArticles(new Set());
  }, []);

  return {
    hiddenArticles,
    hideArticle,
    showArticle,
    isArticleHidden,
    clearAllHidden,
  };
};
