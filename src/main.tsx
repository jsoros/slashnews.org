import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { performanceMonitor } from './utils/performance'

// Initialize performance monitoring
performanceMonitor.mark('app-init-start');

// Log memory usage periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logMemoryUsage();
  }, 30000); // Every 30 seconds
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

performanceMonitor.mark('app-init-end');
performanceMonitor.measure('app-initialization', 'app-init-start', 'app-init-end');
