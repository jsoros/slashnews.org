import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';
import { PerformanceMonitor } from '../utils/performance';
import { hackerNewsApi } from '../services/hackerNewsApi';

// Enhanced memory leak prevention for test environments
const isTestEnv = import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true';
const isCIEnv = import.meta.env.CI === 'true';

let initialMemory: NodeJS.MemoryUsage;

// Memory management for all test environments, with enhanced cleanup
const enableMemoryManagement = isTestEnv;

// Helper function to force garbage collection
function forceGarbageCollection() {
  if (global.gc) {
    global.gc();
  } else if (typeof (global as any).collectGarbage === 'function') {
    (global as any).collectGarbage();
  }
}

// Helper function to clear all timers
function clearAllTimers() {
  // Clear all timers that might be holding references
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
  clearTimeout(highestTimeoutId);
}

if (enableMemoryManagement) {
  beforeEach(() => {
    // Clear any lingering state before each test
    circuitBreakerRegistry.resetAll();
    hackerNewsApi.clearCache();

    // Clear any lingering timers
    clearAllTimers();

    // Force garbage collection before each test
    forceGarbageCollection();

    // Track initial memory
    initialMemory = process.memoryUsage();
  });

  afterEach(() => {
    // Aggressive cleanup to prevent memory accumulation
    circuitBreakerRegistry.resetAll();
    hackerNewsApi.clearCache();

    // Reset PerformanceMonitor singleton
    PerformanceMonitor.resetInstance();

    // Clear DOM if it exists
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
    }

    // Clear any timers that might be holding references
    clearAllTimers();

    // Force multiple garbage collection cycles for thorough cleanup
    forceGarbageCollection();
    setTimeout(() => forceGarbageCollection(), 0);

    // Enhanced memory monitoring
    const currentMemory = process.memoryUsage();
    const memoryGrowth = currentMemory.heapUsed - (initialMemory?.heapUsed || 0);

    // Lower thresholds for more aggressive memory monitoring
    if (currentMemory.heapUsed > 300 * 1024 * 1024) { // 300MB threshold
      console.warn(`High memory usage: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
    }

    // Log any significant memory growth
    if (memoryGrowth > 30 * 1024 * 1024) { // 30MB growth
      console.warn(`Memory growth in test: +${Math.round(memoryGrowth / 1024 / 1024)}MB`);
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