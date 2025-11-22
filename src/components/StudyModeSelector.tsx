import React from 'react';
import './StudyModeSelector.css';

interface StudyModeSelectorProps {
  onSelectMode: (mode: 'study' | 'test') => void;
  onCancel: () => void;
  setName: string;
}

const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({ onSelectMode, onCancel, setName }) => {
  return (
    <div className="mode-selector-overlay" onClick={onCancel}>
      <div className="mode-selector-content glass-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="mode-selector-title">Choose Learning Mode</h2>
        <p className="mode-selector-subtitle">{setName}</p>

        <div className="mode-options">
          <button
            className="mode-option glass-card"
            onClick={() => onSelectMode('study')}
          >
            <div className="mode-icon">📖</div>
            <h3>Study Mode</h3>
            <p>Learn and review without pressure</p>
            <ul className="mode-features">
              <li>No progress tracking</li>
              <li>No level changes</li>
              <li>Just focus on learning</li>
            </ul>
          </button>

          <button
            className="mode-option glass-card"
            onClick={() => onSelectMode('test')}
          >
            <div className="mode-icon">✅</div>
            <h3>Test Mode</h3>
            <p>Check your mastery and level up</p>
            <ul className="mode-features">
              <li>Track your accuracy</li>
              <li>Level up on correct answers</li>
              <li>Mark words as learned</li>
            </ul>
          </button>
        </div>

        <button className="mode-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StudyModeSelector;

