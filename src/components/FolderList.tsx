import React, { useState } from 'react';
import { Folder, VocabularySet } from '../types';
import { useAppContext } from '../context/AppContext';

interface FolderListProps {
  folders: Folder[];
  sets: VocabularySet[];
  onSelectFolder: (folderId: string) => void;
  onSelectSet: (setId: string) => void;
  selectedFolderId: string | null;
  selectedSetId: string | null;
  onShowImportForm?: () => void;
}

const FolderList: React.FC<FolderListProps> = ({
  folders,
  sets,
  onSelectFolder,
  onSelectSet,
  selectedFolderId,
  selectedSetId,
  onShowImportForm
}) => {
  const { dispatch } = useAppContext();
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState<string | null>(null);

  const generateId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const folder: Folder = {
      id: generateId(),
      name: newFolderName.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      setCount: 0
    };
    
    dispatch({ type: 'CREATE_FOLDER', payload: folder });
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    dispatch({
      type: 'UPDATE_FOLDER',
      payload: { ...folder, name: newName.trim(), updatedAt: new Date() }
    });
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa folder này? Tất cả sets và words bên trong sẽ bị xóa.')) {
      dispatch({ type: 'DELETE_FOLDER', payload: folderId });
      if (selectedFolderId === folderId) {
        onSelectFolder('');
      }
    }
  };

  const handleCreateSet = (folderId: string) => {
    if (!newSetName.trim()) return;
    
    const set: VocabularySet = {
      id: generateId(),
      name: newSetName.trim(),
      folderId,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0
    };
    
    dispatch({ type: 'CREATE_VOCABULARY_SET', payload: set });
    setNewSetName('');
    setShowCreateSet(null);
  };

  const handleRenameSet = (setId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const set = sets.find(s => s.id === setId);
    if (!set) return;
    
    dispatch({
      type: 'UPDATE_VOCABULARY_SET',
      payload: { ...set, name: newName.trim(), updatedAt: new Date() }
    });
    setEditingSetId(null);
  };

  const handleDeleteSet = (setId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa set này? Tất cả words bên trong sẽ bị xóa.')) {
      dispatch({ type: 'DELETE_VOCABULARY_SET', payload: setId });
      if (selectedSetId === setId) {
        onSelectSet('');
      }
    }
  };

  const folderSets = (folderId: string) => sets.filter(s => s.folderId === folderId);

  return (
    <div className="folder-list-container">
      <div className="folder-list-header">
        <h2>📁 Folders & Sets</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateFolder(true)}
        >
          ➕ Tạo Folder
        </button>
      </div>

      {showCreateFolder && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="input-group">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Tên folder..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
          </div>
          <div className="controls">
            <button className="btn btn-primary" onClick={handleCreateFolder}>
              Tạo
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName('');
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>Chưa có folder nào</h3>
            <p>Tạo folder đầu tiên để bắt đầu tổ chức từ vựng của bạn!</p>
          </div>
        </div>
      ) : (
        folders.map(folder => {
          const folderSetsList = folderSets(folder.id);
          const isExpanded = selectedFolderId === folder.id;

          return (
            <div key={folder.id} className="folder-item">
              <div
                className={`folder-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => onSelectFolder(isExpanded ? '' : folder.id)}
              >
                <span className="folder-icon">📁</span>
                {editingFolderId === folder.id ? (
                  <input
                    type="text"
                    defaultValue={folder.name}
                    onBlur={(e) => handleRenameFolder(folder.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameFolder(folder.id, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="folder-name">{folder.name}</span>
                )}
                <span className="folder-count">({folder.setCount} sets)</span>
                <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-icon"
                    onClick={() => setEditingFolderId(folder.id)}
                    title="Đổi tên"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteFolder(folder.id)}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => setShowCreateSet(showCreateSet === folder.id ? null : folder.id)}
                    title="Tạo set mới"
                  >
                    ➕
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="sets-container">
                  {showCreateSet === folder.id && (
                    <div className="card" style={{ marginBottom: '8px' }}>
                      <div className="input-group">
                        <input
                          type="text"
                          value={newSetName}
                          onChange={(e) => setNewSetName(e.target.value)}
                          placeholder="Tên set..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateSet(folder.id);
                            if (e.key === 'Escape') {
                              setShowCreateSet(null);
                              setNewSetName('');
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="controls">
                        <button className="btn btn-primary" onClick={() => handleCreateSet(folder.id)}>
                          Tạo
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowCreateSet(null);
                            setNewSetName('');
                          }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}

                  {folderSetsList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '16px' }}>
                      <p>Chưa có set nào. Tạo set đầu tiên!</p>
                    </div>
                  ) : (
                    folderSetsList.map(set => (
                      <div
                        key={set.id}
                        className={`set-item ${selectedSetId === set.id ? 'selected' : ''}`}
                        onClick={() => onSelectSet(set.id)}
                      >
                        <span className="set-icon">📚</span>
                        {editingSetId === set.id ? (
                          <input
                            type="text"
                            defaultValue={set.name}
                            onBlur={(e) => handleRenameSet(set.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSet(set.id, e.currentTarget.value);
                              }
                              if (e.key === 'Escape') setEditingSetId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span className="set-name">{set.name}</span>
                        )}
                        <span className="set-count">({set.wordCount} words)</span>
                        <div className="set-actions" onClick={(e) => e.stopPropagation()}>
                          {selectedSetId === set.id && onShowImportForm && (
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowImportForm();
                              }}
                              title="Thêm từ mới"
                            >
                              ➕
                            </button>
                          )}
                          <button
                            className="btn-icon"
                            onClick={() => setEditingSetId(set.id)}
                            title="Đổi tên"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDeleteSet(set.id)}
                            title="Xóa"
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
        })
      )}
    </div>
  );
};

export default FolderList;

