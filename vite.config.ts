/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  cacheDir: 'node_modules/.vite', // Set cache directory at top level
  // @ts-expect-error - Vite config types don't include test property
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000, // Increased timeout for memory-constrained environments
    hookTimeout: 15000,
    teardownTimeout: 15000,
    pool: 'forks', // Use forks instead of threads for better memory isolation
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1, // Always use single fork for memory efficiency
        singleFork: true, // Force single fork mode to prevent memory accumulation
        memoryLimit: '1024MB', // Set explicit memory limit per fork
      }
    },
    // Aggressive memory management
    maxConcurrency: 1, // Force sequential test execution
    sequence: {
      concurrent: false, // Always disable concurrency for memory safety
      shuffle: false // Disable shuffling to ensure predictable memory usage
    },
    // Enhanced cleanup
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    // Isolate tests to prevent memory accumulation between test files
    isolate: true,
    // Disable file-level parallelism for memory efficiency
    fileParallelism: false,
    // Force garbage collection between test files
    forceRerunTriggers: ['**/package.json'],
    // Additional memory optimization settings
    logHeapUsage: true, // Enable heap usage logging for debugging
    allowOnly: false,
  },
})
