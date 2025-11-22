import React, { useState, useEffect, useRef } from 'react';
import './CreateDialog.css';

interface CreateDialogProps {
  type: 'folder' | 'set';
  onConfirm: (name: string) => void;
  onCancel: () => void;
  defaultName: string;
}

const CreateDialog: React.FC<CreateDialogProps> = ({ type, onConfirm, onCancel, defaultName }) => {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input when dialog opens
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="create-dialog-overlay" onClick={onCancel}>
      <div className="create-dialog glass-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="create-dialog-title">
          <span className="create-dialog-icon">{type === 'folder' ? '📁' : '📚'}</span>
          {type === 'folder' ? 'Create New Folder' : 'Create New Set'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={type === 'folder' ? 'Folder name...' : 'Set name...'}
            className="create-dialog-input"
          />
          
          <div className="create-dialog-actions">
            <button
              type="button"
              onClick={onCancel}
              className="create-dialog-btn create-dialog-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="create-dialog-btn create-dialog-btn-confirm"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDialog;

