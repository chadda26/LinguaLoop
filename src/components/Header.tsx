import React from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'deck';
  onSelectTab: (tab: 'dashboard' | 'deck') => void;
  dueCount: number;
  onResetSampleData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  dueCount,
  onResetSampleData,
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-title">
            <span className="logo-glyph" aria-hidden="true">
              L
            </span>
            <span>LinguaLoop</span>
          </div>
          <span className="brand-subtitle">Learn smarter. Remember longer.</span>
        </div>

        <nav className="header-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onSelectTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'deck' ? 'active' : ''}`}
            onClick={() => onSelectTab('deck')}
            aria-current={activeTab === 'deck' ? 'page' : undefined}
          >
            My Flashcards
          </button>
        </nav>

        <div className="header-actions">
          <div
            className={`due-indicator ${dueCount > 0 ? 'has-due' : 'all-caught-up'}`}
            title={`${dueCount} card${dueCount === 1 ? '' : 's'} scheduled for review today or overdue`}
            aria-label={`${dueCount} cards due for review`}
          >
            <span className="indicator-dot" aria-hidden="true" />
            <span>
              {dueCount} {dueCount === 1 ? 'card' : 'cards'} due
            </span>
          </div>

          <button
            type="button"
            className="reset-btn"
            onClick={onResetSampleData}
            title="Reset storage to default 5 sample cards"
          >
            Reset Sample Data
          </button>
        </div>
      </div>
    </header>
  );
};
