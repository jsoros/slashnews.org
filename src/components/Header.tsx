import React, { useState } from 'react';

type ViewMode = 'title' | 'compact' | 'full';

interface HeaderProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentCategory, onCategoryChange, viewMode, onViewModeChange }) => {
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const categories = [
    { id: 'top', name: 'Top Stories' },
    { id: 'new', name: 'New' },
    { id: 'best', name: 'Best' }
  ];

  return (
    <>
      <div className="header">
        <h1>Hacker News • Slashdot Style</h1>
        <div className="tagline">News for Nerds, Stuff that Matters (via HackerNews API)</div>
      </div>
      <nav className="navigation">
        <div className="nav-left">
          {categories.map(category => (
            <a
              key={category.id}
              href="#"
              className={currentCategory === category.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                onCategoryChange(category.id);
              }}
            >
              {category.name}
            </a>
          ))}
          <span className="nav-separator">|</span>
          <a href="https://news.ycombinator.com/" target="_blank" rel="noopener noreferrer">
            Original HN
          </a>
          <a href="https://slashdot.org/" target="_blank" rel="noopener noreferrer">
            Slashdot
          </a>
          <a href="https://github.com/HackerNews/API" target="_blank" rel="noopener noreferrer">
            HN API
          </a>
        </div>

        <div className="nav-right">
          <div className="view-mode-dropdown">
            <button 
              className="gear-btn"
              onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
              title="View Options"
            >
              ⚙️
            </button>
            {showViewModeDropdown && (
              <div className="dropdown-content">
                <button 
                  className={`dropdown-item ${viewMode === 'title' ? 'active' : ''}`}
                  onClick={() => {
                    onViewModeChange('title');
                    setShowViewModeDropdown(false);
                  }}
                >
                  📋 Title View
                </button>
                <button 
                  className={`dropdown-item ${viewMode === 'compact' ? 'active' : ''}`}
                  onClick={() => {
                    onViewModeChange('compact');
                    setShowViewModeDropdown(false);
                  }}
                >
                  📰 Compact View
                </button>
                <button 
                  className={`dropdown-item ${viewMode === 'full' ? 'active' : ''}`}
                  onClick={() => {
                    onViewModeChange('full');
                    setShowViewModeDropdown(false);
                  }}
                >
                  📖 Full View
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};