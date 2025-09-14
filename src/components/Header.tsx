import React, { useState } from 'react';

type ViewMode = 'title' | 'compact' | 'full';

interface HeaderProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showAbout: boolean;
  onShowAbout: () => void;
  showHiddenArticles: boolean;
  onToggleHiddenArticles: () => void;
  onClearHiddenArticles: () => void;
}

export const Header = React.memo<HeaderProps>(({ currentCategory, onCategoryChange, viewMode, onViewModeChange, showAbout, onShowAbout, showHiddenArticles, onToggleHiddenArticles, onClearHiddenArticles }) => {
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const categories = [
    { id: 'top', name: 'Top Stories' },
    { id: 'new', name: 'New' },
    { id: 'best', name: 'Best' }
  ];

  return (
    <>
      <div className="header">
        <h1>Hacker News • Classic Style</h1>
        <div className="tagline">News for Nerds, Stuff that Matters (via HackerNews API)</div>
      </div>
      <nav id="navigation" className="navigation" role="navigation" aria-label="Main navigation">
        <div className="nav-left">
          <ul role="list" style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: '1rem' }}>
            {categories.map(category => (
              <li key={category.id}>
                <a
                  href="#"
                  className={currentCategory === category.id ? 'active' : ''}
                  aria-current={currentCategory === category.id ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onCategoryChange(category.id);
                  }}
                >
                  {category.name}
                </a>
              </li>
            ))}
            <li aria-hidden="true">
              <span className="nav-separator">|</span>
            </li>
            <li>
              <a 
                href="https://news.ycombinator.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Original Hacker News (opens in new tab)"
              >
                Original HN
              </a>
            </li>
            <li>
              <a
                href="https://github.com/HackerNews/API"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Hacker News API documentation (opens in new tab)"
              >
                HN API
              </a>
            </li>
            <li>
              <a
                href="#"
                className={showAbout ? 'active' : ''}
                aria-current={showAbout ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onShowAbout();
                }}
              >
                About
              </a>
            </li>
          </ul>
        </div>

        <div className="nav-right">
          <div className="view-mode-dropdown">
            <button 
              className="gear-btn"
              onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
              aria-label="View Options"
              aria-haspopup="menu"
              aria-expanded={showViewModeDropdown}
              type="button"
            >
              ⚙️
            </button>
            {showViewModeDropdown && (
              <div 
                className="dropdown-content" 
                role="menu" 
                aria-label="View mode options"
              >
                <button 
                  className={`dropdown-item ${viewMode === 'title' ? 'active' : ''}`}
                  role="menuitem"
                  aria-checked={viewMode === 'title'}
                  onClick={() => {
                    onViewModeChange('title');
                    setShowViewModeDropdown(false);
                  }}
                >
                  <span aria-hidden="true">📋</span> Title View
                </button>
                <button 
                  className={`dropdown-item ${viewMode === 'compact' ? 'active' : ''}`}
                  role="menuitem"
                  aria-checked={viewMode === 'compact'}
                  onClick={() => {
                    onViewModeChange('compact');
                    setShowViewModeDropdown(false);
                  }}
                >
                  <span aria-hidden="true">📰</span> Compact View
                </button>
                <button
                  className={`dropdown-item ${viewMode === 'full' ? 'active' : ''}`}
                  role="menuitem"
                  aria-checked={viewMode === 'full'}
                  onClick={() => {
                    onViewModeChange('full');
                    setShowViewModeDropdown(false);
                  }}
                >
                  <span aria-hidden="true">📖</span> Full View
                </button>

                <div className="dropdown-separator" />

                <button
                  className={`dropdown-item ${showHiddenArticles ? 'active' : ''}`}
                  role="menuitem"
                  aria-checked={showHiddenArticles}
                  onClick={() => {
                    onToggleHiddenArticles();
                    setShowViewModeDropdown(false);
                  }}
                >
                  <span aria-hidden="true">👁️</span> Show Hidden Articles
                </button>

                <button
                  className="dropdown-item dropdown-item-danger"
                  role="menuitem"
                  onClick={() => {
                    onClearHiddenArticles();
                    setShowViewModeDropdown(false);
                  }}
                >
                  <span aria-hidden="true">🗑️</span> Clear All Hidden Articles
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.currentCategory === nextProps.currentCategory &&
         prevProps.viewMode === nextProps.viewMode &&
         prevProps.showAbout === nextProps.showAbout &&
         prevProps.showHiddenArticles === nextProps.showHiddenArticles;
});