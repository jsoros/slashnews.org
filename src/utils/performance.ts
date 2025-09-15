import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.setupPerformanceObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe Core Web Vitals
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const value = (entry as PerformanceEntry & { value?: number }).value || entry.duration || 0;
          this.logMetric(entry.name, value, 'Core Web Vital');
        }
      });

      // Observe different entry types if supported
      if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
        vitalsObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
        vitalsObserver.observe({ entryTypes: ['first-input'] });
      }

      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
        vitalsObserver.observe({ entryTypes: ['layout-shift'] });
      }

      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.logNavigationTiming(navEntry);
        }
      });

      if (PerformanceObserver.supportedEntryTypes.includes('navigation')) {
        navigationObserver.observe({ entryTypes: ['navigation'] });
      }

      // Observe resource timing for API calls
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.name.includes('hacker-news.firebaseio.com')) {
            this.logAPITiming(resourceEntry);
          }
        }
      });

      if (PerformanceObserver.supportedEntryTypes.includes('resource')) {
        resourceObserver.observe({ entryTypes: ['resource'] });
      }

      this.observers.push(vitalsObserver, navigationObserver, resourceObserver);
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private logMetric(name: string, value: number, type: string): void {
    if (import.meta.env.DEV) {
      console.log(`[Performance ${type}] ${name}: ${Math.round(value)}ms`);
    }
    
    // Store measurement
    this.measurements.set(`${type}:${name}`, value);
  }

  private logNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      'DNS Lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'TCP Connect': entry.connectEnd - entry.connectStart,
      'TLS Setup': entry.connectEnd - entry.secureConnectionStart,
      'Request': entry.responseStart - entry.requestStart,
      'Response': entry.responseEnd - entry.responseStart,
      'DOM Processing': entry.domComplete - entry.responseEnd,
      'Load Complete': entry.loadEventEnd - entry.startTime,
      'DOM Content Loaded': entry.domContentLoadedEventEnd - entry.startTime,
      'Time to Interactive': entry.domInteractive - entry.startTime
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.logMetric(name, value, 'Navigation');
      }
    });
  }

  private logAPITiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.requestStart;
    const urlParts = entry.name.split('/');
    const endpoint = urlParts[urlParts.length - 1] || 'unknown';
    
    this.logMetric(`API-${endpoint}`, duration, 'API Call');
  }

  // Manual performance measurements
  mark(name: string): void {
    if (typeof window !== 'undefined' && window.performance && typeof window.performance.mark === 'function') {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof window === 'undefined' || !window.performance || typeof window.performance.measure !== 'function') {
      return null;
    }

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        this.logMetric(name, duration, 'Custom');
        return duration;
      }
    } catch (error) {
      console.warn(`Performance measurement failed for ${name}:`, error);
    }

    return null;
  }

  // Get current measurements
  getMeasurements(): Map<string, number> {
    return new Map(this.measurements);
  }

  // Log memory usage
  logMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance && (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      console.log('[Performance Memory]', {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
      });
    }
  }

  // Clean up observers
  dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.measurements.clear();
  }

  // Reset singleton instance (for testing)
  static resetInstance(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.dispose();
      PerformanceMonitor.instance = undefined as unknown as PerformanceMonitor;
    }
  }
}

// Convenience functions for React components
export const usePerformanceMonitor = () => {
  return PerformanceMonitor.getInstance();
};

// React hook for measuring component render time
export const useRenderTime = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  
  React.useEffect(() => {
    monitor.mark(`${componentName}-render-start`);
    
    return () => {
      monitor.mark(`${componentName}-render-end`);
      monitor.measure(
        `${componentName}-render-time`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      );
    };
  });
};

// Function to measure async operations
export const measureAsync = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance();
  monitor.mark(`${name}-start`);
  
  try {
    const result = await operation();
    monitor.mark(`${name}-end`);
    monitor.measure(`${name}-duration`, `${name}-start`, `${name}-end`);
    return result;
  } catch (error) {
    monitor.mark(`${name}-error`);
    monitor.measure(`${name}-error-duration`, `${name}-start`, `${name}-error`);
    throw error;
  }
};

// Export singleton instance for direct use
export const performanceMonitor = PerformanceMonitor.getInstance();