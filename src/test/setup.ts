import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';
import { performanceMonitor } from '../utils/performance';
import { hackerNewsApi } from '../services/hackerNewsApi';

// Set test environment flag to disable circuit breakers
process.env.NODE_ENV = 'test';

// Global test cleanup to prevent memory leaks - only run cleanup in CI where memory issues occur
if (process.env.CI) {
  afterEach(() => {
    // Clean up singletons to prevent memory accumulation
    circuitBreakerRegistry.resetAll();
    performanceMonitor.dispose();
    hackerNewsApi.clearCache();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Log memory usage in CI for debugging
    const memUsed = process.memoryUsage();
    if (memUsed.heapUsed > 100 * 1024 * 1024) { // 100MB threshold
      console.warn(`High memory usage: ${Math.round(memUsed.heapUsed / 1024 / 1024)}MB`);
    }
  });
}

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