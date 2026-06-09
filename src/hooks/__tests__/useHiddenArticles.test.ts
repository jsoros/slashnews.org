import { renderHook, act } from '@testing-library/react';
import { useHiddenArticles, STORAGE_KEY } from '../useHiddenArticles';
import type { MockInstance } from 'vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('useHiddenArticles', () => {
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    localStorage.clear();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with an empty set if localStorage is empty', () => {
    const { result } = renderHook(() => useHiddenArticles());

    expect(result.current.hiddenArticles).toBeInstanceOf(Set);
    expect(result.current.hiddenArticles.size).toBe(0);
  });

  it('should initialize with values from localStorage if present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

    const { result } = renderHook(() => useHiddenArticles());

    expect(result.current.hiddenArticles.size).toBe(3);
    expect(result.current.hiddenArticles.has(1)).toBe(true);
    expect(result.current.hiddenArticles.has(2)).toBe(true);
    expect(result.current.hiddenArticles.has(3)).toBe(true);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json');

    const { result } = renderHook(() => useHiddenArticles());

    expect(result.current.hiddenArticles.size).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load hidden articles:', expect.any(SyntaxError));
  });

  it('should add an article to hidden list when hideArticle is called', () => {
    const { result } = renderHook(() => useHiddenArticles());

    act(() => {
      result.current.hideArticle(123);
    });

    expect(result.current.hiddenArticles.has(123)).toBe(true);
    expect(result.current.hiddenArticles.size).toBe(1);

    // Test that localStorage is updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored).toContain(123);
  });

  it('should remove an article from hidden list when showArticle is called', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([123, 456]));

    const { result } = renderHook(() => useHiddenArticles());

    act(() => {
      result.current.showArticle(123);
    });

    expect(result.current.hiddenArticles.has(123)).toBe(false);
    expect(result.current.hiddenArticles.has(456)).toBe(true);

    // Test that localStorage is updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored).not.toContain(123);
    expect(stored).toContain(456);
  });

  it('should correctly report if an article is hidden via isArticleHidden', () => {
    const { result } = renderHook(() => useHiddenArticles());

    expect(result.current.isArticleHidden(123)).toBe(false);

    act(() => {
      result.current.hideArticle(123);
    });

    expect(result.current.isArticleHidden(123)).toBe(true);
  });

  it('should clear all hidden articles when clearAllHidden is called', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

    const { result } = renderHook(() => useHiddenArticles());

    expect(result.current.hiddenArticles.size).toBe(3);

    act(() => {
      result.current.clearAllHidden();
    });

    expect(result.current.hiddenArticles.size).toBe(0);

    // Test that localStorage is updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored.length).toBe(0);
  });
});
