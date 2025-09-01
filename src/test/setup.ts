import '@testing-library/jest-dom';

// Mock IntersectionObserver for tests
(global as { IntersectionObserver: unknown }).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: readonly number[] = [];
  
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(_target: Element) {}
  disconnect() {}
  unobserve(_target: Element) {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
};