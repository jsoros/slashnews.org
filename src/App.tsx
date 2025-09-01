import { useState } from 'react';
import { Header } from './components/Header';
import { StoryList } from './components/StoryList';
import './styles/slashdot.css';

type ViewMode = 'title' | 'compact' | 'full';

function App() {
  const [currentCategory, setCurrentCategory] = useState('top');
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div>
      <Header 
        currentCategory={currentCategory}
        onCategoryChange={handleCategoryChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <main className="main-content">
        <StoryList 
          maxStories={30} 
          category={currentCategory}
          viewMode={viewMode}
        />
      </main>
    </div>
  );
}

export default App
