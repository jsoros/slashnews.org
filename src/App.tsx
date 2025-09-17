import { useState } from 'react';
import { Header } from './components/Header';
import { StoryList } from './components/StoryList';
import { About } from './components/About';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSkipLinks, useAnnouncer } from './hooks/useKeyboardNavigation';
import { useHiddenArticles } from './hooks/useHiddenArticles';
import './styles/toodles.css';

type ViewMode = 'title' | 'compact' | 'full';

function App() {
  const [currentCategory, setCurrentCategory] = useState('top');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [showAbout, setShowAbout] = useState(false);
  const [showHiddenArticles, setShowHiddenArticles] = useState(false);
  const { skipToContent, skipToNavigation } = useSkipLinks();
  const { announce, announcementProps } = useAnnouncer();
  const { clearAllHidden } = useHiddenArticles();

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);
    setShowAbout(false);
    announce(`Switched to ${category} stories`);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    announce(`View mode changed to ${mode}`);
  };

  const handleShowAbout = () => {
    setShowAbout(true);
    announce('Showing about page');
  };

  const handleToggleHiddenArticles = () => {
    setShowHiddenArticles(prev => !prev);
    announce(showHiddenArticles ? 'Hiding hidden articles' : 'Showing hidden articles');
  };

  const handleClearHiddenArticles = () => {
    clearAllHidden();
    setShowHiddenArticles(false);
    announce('All hidden articles cleared');
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
          showAbout={showAbout}
          onShowAbout={handleShowAbout}
          showHiddenArticles={showHiddenArticles}
          onToggleHiddenArticles={handleToggleHiddenArticles}
          onClearHiddenArticles={handleClearHiddenArticles}
        />
      </ErrorBoundary>
      
      <main id="main-content" className="main-content" tabIndex={-1}>
        <ErrorBoundary>
          {showAbout ? (
            <About />
          ) : (
            <StoryList
              category={currentCategory}
              viewMode={viewMode}
              showHiddenArticles={showHiddenArticles}
            />
          )}
        </ErrorBoundary>
      </main>
      
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

export default App
