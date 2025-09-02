import { useState } from 'react';
import { Header } from './components/Header';
import { StoryList } from './components/StoryList';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSkipLinks, useAnnouncer } from './hooks/useKeyboardNavigation';
import './styles/classic.css';

type ViewMode = 'title' | 'compact' | 'full';

function App() {
  const [currentCategory, setCurrentCategory] = useState('top');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const { skipToContent, skipToNavigation } = useSkipLinks();
  const { announce, announcementProps } = useAnnouncer();

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);
    announce(`Switched to ${category} stories`);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    announce(`View mode changed to ${mode}`);
  };

  return (
    <div>
      {/* Skip links for keyboard navigation */}
      <a href="#main-content" className="skip-link" onClick={(e) => {
        e.preventDefault();
        skipToContent();
      }}>
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link" onClick={(e) => {
        e.preventDefault();
        skipToNavigation();
      }}>
        Skip to navigation
      </a>

      {/* Screen reader announcements */}
      <div {...announcementProps} />

      <ErrorBoundary>
        <Header 
          currentCategory={currentCategory}
          onCategoryChange={handleCategoryChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </ErrorBoundary>
      
      <main id="main-content" className="main-content" tabIndex={-1}>
        <ErrorBoundary>
          <StoryList 
            category={currentCategory}
            viewMode={viewMode}
          />
        </ErrorBoundary>
      </main>
      
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

export default App
