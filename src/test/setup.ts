import '@testing-library/jest-dom';

// Set test environment flag to disable circuit breakers
process.env.NODE_ENV = 'test';

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