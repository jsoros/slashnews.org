/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  // @ts-expect-error - Vite config types don't include test property
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000, // 15 second timeout to prevent hanging
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'forks', // Use forks instead of threads for better memory isolation
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: process.env.CI ? 1 : 2, // Single fork in CI for memory efficiency
        singleFork: process.env.CI ? true : false,
      }
    },
    // Memory management optimizations
    maxConcurrency: process.env.CI ? 1 : 5,
    sequence: {
      concurrent: process.env.CI ? false : true // Disable concurrency in CI
    },
    // Enhanced cleanup
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
