import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Folder, VocabularySet } from '../types';
import './FoldersManagementPage.css';

interface FoldersManagementPageProps {
  onBack: () => void;
  onSelectSet: (setId: string) => void;
  onShowImportForm: () => void;
}

const FoldersManagementPage: React.FC<FoldersManagementPageProps> = ({
  onBack,
  onSelectSet,
  onShowImportForm
}) => {
  const { state, dispatch } = useAppContext();
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [selectedFolderForSet, setSelectedFolderForSet] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingSet, setEditingSet] = useState<VocabularySet | null>(null);

  const generateId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: generateId(),
      name: newFolderName.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      setCount: 0
    };

    dispatch({ type: 'CREATE_FOLDER', payload: newFolder });
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  const handleCreateSet = () => {
    if (!newSetName.trim()) return;

    const newSet: VocabularySet = {
      id: generateId(),
      name: newSetName.trim(),
      folderId: selectedFolderForSet || '', // Allow no folder
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0
    };

    dispatch({ type: 'CREATE_VOCABULARY_SET', payload: newSet });
    setNewSetName('');
    setShowCreateSet(false);
    setSelectedFolderForSet(null);
  };

  const handleUpdateFolder = () => {
    if (!editingFolder || !newFolderName.trim()) return;

    dispatch({
      type: 'UPDATE_FOLDER',
      payload: { ...editingFolder, name: newFolderName.trim(), updatedAt: new Date() }
    });
    setEditingFolder(null);
    setNewFolderName('');
  };

  const handleUpdateSet = () => {
    if (!editingSet || !newSetName.trim()) return;

    dispatch({
      type: 'UPDATE_VOCABULARY_SET',
      payload: { ...editingSet, name: newSetName.trim(), updatedAt: new Date() }
    });
    setEditingSet(null);
    setNewSetName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm('Delete this folder and all its sets? This cannot be undone.')) {
      dispatch({ type: 'DELETE_FOLDER', payload: folderId });
    }
  };

  const handleDeleteSet = (setId: string) => {
    if (window.confirm('Delete this vocabulary set and all its cards? This cannot be undone.')) {
      dispatch({ type: 'DELETE_VOCABULARY_SET', payload: setId });
    }
  };

  const getSetsInFolder = (folderId: string) => {
    return state.vocabularySets.filter(set => set.folderId === folderId);
  };

  // Get sets without folders
  const orphanedSets = state.vocabularySets.filter(set => !set.folderId || !state.folders.find(f => f.id === set.folderId));

  return (
    <div className="folders-page">
      <div className="folders-container">
        {/* Header */}
        <div className="folders-header">
          <button className="back-btn glass-card" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Home</span>
          </button>
          <h1 className="folders-title">Manage Folders & Sets</h1>
          <div style={{ width: '100px' }}></div> {/* Spacer for centering */}
        </div>

        {/* Action Bar with Create Buttons */}
        <div className="folders-action-bar">
          <button
            className="folders-action-btn glass-card"
            onClick={() => setShowCreateFolder(true)}
          >
            <span className="folders-action-icon">📁</span>
            <span>Create Folder</span>
          </button>
          <button
            className="folders-action-btn glass-card"
            onClick={() => {
              // Auto-select first folder if exists, otherwise create without folder
              if (state.folders.length > 0) {
                setSelectedFolderForSet(state.folders[0].id);
              }
              setShowCreateSet(true);
            }}
          >
            <span className="folders-action-icon">📚</span>
            <span>Create Set</span>
          </button>
        </div>

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Folder</h3>
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCreateFolder(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Folder Modal */}
        {editingFolder && (
          <div className="modal-overlay" onClick={() => setEditingFolder(null)}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Folder</h3>
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateFolder()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setEditingFolder(null)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpdateFolder} disabled={!newFolderName.trim()}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Set Modal */}
        {showCreateSet && (
          <div className="modal-overlay" onClick={() => setShowCreateSet(false)}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Set</h3>
              
              {/* Folder Selection */}
              {state.folders.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    fontWeight: '600'
                  }}>
                    Choose Folder (optional):
                  </label>
                  <select
                    value={selectedFolderForSet || ''}
                    onChange={(e) => setSelectedFolderForSet(e.target.value || null)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">No folder (Uncategorized)</option>
                    {state.folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <input
                type="text"
                placeholder="Set name..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCreateSet(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleCreateSet} disabled={!newSetName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Set Modal */}
        {editingSet && (
          <div className="modal-overlay" onClick={() => setEditingSet(null)}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Set</h3>
              <input
                type="text"
                placeholder="Set name..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSet()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setEditingSet(null)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpdateSet} disabled={!newSetName.trim()}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Folders List */}
        <div className="folders-list">
          {state.folders.length === 0 && orphanedSets.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">📂</div>
              <h3>No Folders Yet</h3>
              <p>Create your first folder to organize your vocabulary sets</p>
            </div>
          ) : (
            <>
              {state.folders.map(folder => {
                const sets = getSetsInFolder(folder.id);
                const isExpanded = expandedFolderId === folder.id;

                return (
                  <div key={folder.id} className="folder-item glass-card">
                    <div className="folder-header" onClick={() => setExpandedFolderId(isExpanded ? null : folder.id)}>
                      <div className="folder-info">
                        <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
                        <div>
                          <h3>{folder.name}</h3>
                          <p>{sets.length} set{sets.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="icon-btn"
                          onClick={() => {
                            setSelectedFolderForSet(folder.id);
                            setShowCreateSet(true);
                          }}
                          title="Add Set"
                        >
                          ➕
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => {
                            setEditingFolder(folder);
                            setNewFolderName(folder.name);
                          }}
                          title="Edit Folder"
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-btn delete-btn"
                          onClick={() => handleDeleteFolder(folder.id)}
                          title="Delete Folder"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="sets-list">
                        {sets.length === 0 ? (
                          <div className="empty-sets">
                            <p>No sets in this folder. Click ➕ to add one.</p>
                          </div>
                        ) : (
                          sets.map(set => (
                            <div key={set.id} className="set-item">
                              <div className="set-info" onClick={() => onSelectSet(set.id)}>
                                <span className="set-icon">📚</span>
                                <div>
                                  <h4>{set.name}</h4>
                                  <p>{set.wordCount} word{set.wordCount !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="set-actions">
                                <button
                                  className="icon-btn"
                                  onClick={() => {
                                    dispatch({ type: 'SET_SELECTED_SET', payload: set.id });
                                    onShowImportForm();
                                  }}
                                  title="Add Words"
                                >
                                  ➕
                                </button>
                                <button
                                  className="icon-btn"
                                  onClick={() => {
                                    setEditingSet(set);
                                    setNewSetName(set.name);
                                  }}
                                  title="Edit Set"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="icon-btn delete-btn"
                                  onClick={() => handleDeleteSet(set.id)}
                                  title="Delete Set"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Orphaned Sets (sets without folders) */}
              {orphanedSets.length > 0 && (
                <div className="folder-item glass-card">
                  <div className="folder-header">
                    <div className="folder-info">
                      <span className="folder-icon">📚</span>
                      <div>
                        <h3>Uncategorized Sets</h3>
                        <p>{orphanedSets.length} set{orphanedSets.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="sets-list">
                    {orphanedSets.map(set => (
                      <div key={set.id} className="set-item">
                        <div className="set-info" onClick={() => onSelectSet(set.id)}>
                          <span className="set-icon">📚</span>
                          <div>
                            <h4>{set.name}</h4>
                            <p>{set.wordCount} word{set.wordCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="set-actions">
                          <button
                            className="icon-btn"
                            onClick={() => {
                              dispatch({ type: 'SET_SELECTED_SET', payload: set.id });
                              onShowImportForm();
                            }}
                            title="Add Words"
                          >
                            ➕
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingSet(set);
                              setNewSetName(set.name);
                            }}
                            title="Edit Set"
                          >
                            ✏️
                          </button>
                          <button
                            className="icon-btn delete-btn"
                            onClick={() => handleDeleteSet(set.id)}
                            title="Delete Set"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoldersManagementPage;

