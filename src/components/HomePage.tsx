import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getStudyStats } from '../utils/spacedRepetition';
import { getOverdueCards, getLongOverdueCards } from '../utils/overdue';
import CreateDialog from './CreateDialog';
import './HomePage.css';

interface HomePageProps {
  onStartQuickStudy: () => void;
  onCreateNewSet: (name: string) => void;
  onCreateNewFolder: (name: string) => void;
  onViewFolders: () => void;
  onOpenSettings: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
  onStartQuickStudy,
  onCreateNewSet,
  onCreateNewFolder,
  onViewFolders,
  onOpenSettings,
  onExportBackup,
  onImportBackup
}) => {
  const { state } = useAppContext();
  const [showCreationMenu, setShowCreationMenu] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState<'folder' | 'set' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showCreationMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside menu
      if (menuRef.current && !menuRef.current.contains(target)) {
        const addBtn = document.querySelector('.add-icon-btn');
        if (!addBtn || !addBtn.contains(target)) {
          setShowCreationMenu(false);
        }
      }
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCreationMenu]);

  const handleCreateFolder = () => {
    console.log('Opening Create Folder dialog');
    setShowCreationMenu(false);
    setShowCreateDialog('folder');
  };

  const handleCreateSet = () => {
    console.log('Opening Create Set dialog');
    setShowCreationMenu(false);
    setShowCreateDialog('set');
  };

  const activeFlashcards = useMemo(
    () => state.flashcards.filter(card => card.status !== 'learned'),
    [state.flashcards]
  );

  const learnedFlashcards = useMemo(
    () => state.flashcards.filter(card => card.status === 'learned'),
    [state.flashcards]
  );

  const stats = useMemo(() => getStudyStats(activeFlashcards), [activeFlashcards]);
  const overdueCards = useMemo(() => getOverdueCards(activeFlashcards), [activeFlashcards]);
  const longOverdueCards = useMemo(() => getLongOverdueCards(activeFlashcards), [activeFlashcards]);

  const totalActiveCards = activeFlashcards.length;
  const hasCards = totalActiveCards > 0;

  return (
    <div className="home-page">
      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateDialog
          type={showCreateDialog}
          onConfirm={(name) => {
            console.log(`Creating ${showCreateDialog}:`, name);
            if (showCreateDialog === 'folder') {
              onCreateNewFolder(name);
            } else {
              onCreateNewSet(name);
            }
            setShowCreateDialog(null);
          }}
          onCancel={() => setShowCreateDialog(null)}
          defaultName={
            showCreateDialog === 'folder' 
              ? `Folder ${state.folders.length + 1}` 
              : `Set ${state.vocabularySets.length + 1}`
          }
        />
      )}

      {/* Top Navigation Bar */}
      <div className="home-top-nav">
        <button 
          type="button"
          className="add-icon-btn"
          onClick={(e) => {
            e.preventDefault();
            console.log('+ button clicked, current state:', showCreationMenu);
            setShowCreationMenu(!showCreationMenu);
          }}
          aria-label="Create"
          title="Create Folder or Set"
        >
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>+</span>
        </button>
        
        <button 
          className="settings-icon-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
          </svg>
        </button>
      </div>

      {/* Creation Menu Dropdown */}
      {showCreationMenu && (
        <div className="creation-menu" ref={menuRef}>
          <button 
            type="button"
            className="creation-menu-item"
            onClick={handleCreateFolder}
          >
            <span className="creation-menu-icon">📁</span>
            <span>Create Folder</span>
          </button>
          <button 
            type="button"
            className="creation-menu-item"
            onClick={handleCreateSet}
          >
            <span className="creation-menu-icon">📚</span>
            <span>Create Set</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="home-container">
        {/* Header */}
        <div className="home-header">
          <h1 className="home-title">
            <span className="title-icon">📚</span>
            Vocabulary Flashcards
          </h1>
          <p className="home-subtitle">Master your vocabulary with spaced repetition</p>
        </div>

        {/* Quick Study Area - Center */}
        <div className="quick-study-section glass-card">
          <div className="quick-study-content">
            <h2 className="quick-study-title">
              <span className="glow-icon">⚡</span>
              Quick Study
            </h2>
            <p className="quick-study-description">
              {hasCards 
                ? `Start learning immediately with ${totalActiveCards} card${totalActiveCards !== 1 ? 's' : ''} ready`
                : 'Create your first set to start learning'}
            </p>
            
            {hasCards && (
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="stat-value">{stats.due}</span>
                  <span className="stat-label">Due Today</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-value">{overdueCards.length + longOverdueCards.length}</span>
                  <span className="stat-label">Overdue</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-value">{stats.new}</span>
                  <span className="stat-label">New Words</span>
                </div>
              </div>
            )}

            <button 
              className="quick-study-btn glow-btn"
              onClick={onStartQuickStudy}
              disabled={!hasCards}
            >
              <span className="btn-icon">🚀</span>
              <span>Start Quick Study</span>
            </button>
          </div>
        </div>

        {/* Navigate to Folders Button */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <button 
            className="glow-btn"
            onClick={onViewFolders}
            style={{ marginTop: '8px' }}
          >
            <span className="btn-icon">📁</span>
            <span>Manage Folders & Sets</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <h3 className="stats-title">Your Progress</h3>
          <div className="stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-icon">📚</div>
              <div className="stat-info">
                <div className="stat-number">{state.flashcards.length}</div>
                <div className="stat-name">Total Cards</div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-number">{learnedFlashcards.length}</div>
                <div className="stat-name">Mastered</div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-number">{state.studySessions.length}</div>
                <div className="stat-name">Study Sessions</div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <div className="stat-number">{overdueCards.length + longOverdueCards.length}</div>
                <div className="stat-name">Từ vựng học muộn</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Distribution */}
        {hasCards && (
          <div className="level-distribution">
            <h3 className="stats-title">Learning Progress by Level</h3>
            <div className="levels-grid">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <div key={level} className="level-card glass-card">
                  <div className="level-badge">L{level}</div>
                  <div className="level-count">{count}</div>
                  <div className="level-label">
                    {level === '0' ? 'New' : 
                     level === '1' ? '1 Day' :
                     level === '2' ? '3 Days' :
                     level === '3' ? '1 Week' :
                     level === '4' ? '2 Weeks' : '1 Month'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backup Section */}
        <div className="backup-section">
          <h3 className="stats-title">💾 Backup & Restore</h3>
          <div className="backup-cards">
            <div className="backup-card glass-card" onClick={onExportBackup}>
              <div className="backup-icon">⬇️</div>
              <h4>Export Data</h4>
              <p>Download your vocabulary data as JSON</p>
            </div>
            <div className="backup-card glass-card" onClick={onImportBackup}>
              <div className="backup-icon">⬆️</div>
              <h4>Import Data</h4>
              <p>Restore from a backup file</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

