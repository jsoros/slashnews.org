import '@testing-library/jest-dom';

// Mock IntersectionObserver for tests
(global as { IntersectionObserver: unknown }).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: readonly number[] = [];
  
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
};