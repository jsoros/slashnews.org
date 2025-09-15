import { useState, useEffect, useCallback } from 'react';

const HIDDEN_ARTICLES_KEY = 'hiddenArticles';

export const useHiddenArticles = () => {
  const [hiddenArticles, setHiddenArticles] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem(HIDDEN_ARTICLES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn('Failed to load hidden articles from sessionStorage:', error);
    }
    return new Set();
  });

  const updateSessionStorage = useCallback((articles: Set<number>) => {
    try {
      sessionStorage.setItem(HIDDEN_ARTICLES_KEY, JSON.stringify(Array.from(articles)));
    } catch (error) {
      console.warn('Failed to save hidden articles to sessionStorage:', error);
    }
  }, []);

  useEffect(() => {
    updateSessionStorage(hiddenArticles);
  }, [hiddenArticles, updateSessionStorage]);

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
  }, [hiddenArticles]); // Properly depend on hiddenArticles

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