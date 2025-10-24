import React, { useState } from 'react';
import { Flashcard } from '../types';
import styles from './EditForm.module.css';

interface EditFormProps {
  card: Flashcard;
  onSave: (updatedCard: Flashcard) => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ card, onSave, onCancel }) => {
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [levelInput, setLevelInput] = useState(() => String(card.currentLevel ?? 0));
  const [levelError, setLevelError] = useState<string | null>(null);

  const validateLevel = (value: string) => {
    if (!value.trim()) {
      setLevelError('Vui lòng nhập cấp độ từ 0 đến 5.');
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      setLevelError('Cấp độ phải là một số.');
      return;
    }

    if (parsed < 0 || parsed > 5) {
      setLevelError('Cấp độ hợp lệ nằm trong khoảng 0 đến 5.');
      return;
    }

    setLevelError(null);
  };

  const handleSave = () => {
    if (term.trim() && definition.trim()) {
      const parsedLevel = Number(levelInput);
      if (!Number.isFinite(parsedLevel) || Number.isNaN(parsedLevel) || parsedLevel < 0 || parsedLevel > 5) {
        setLevelError('Cấp độ hợp lệ nằm trong khoảng 0 đến 5.');
        return;
      }

      const clampedLevel = Math.max(0, Math.min(5, Math.round(parsedLevel)));

      const updatedCard: Flashcard = {
        ...card,
        term: term.trim(),
        definition: definition.trim(),
        currentLevel: clampedLevel
      };
      onSave(updatedCard);
    }
  };

  return (
    <div className="card">
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Chỉnh sửa từ vựng</h2>
        <button
          onClick={onCancel}
          className={styles.closeButton}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="input-group">
        <label>Từ tiếng Anh</label>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nhập từ tiếng Anh"
          autoFocus
        />
      </div>

      <div className="input-group">
        <label>Định nghĩa</label>
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Nhập định nghĩa"
          rows={4}
        />
      </div>

      <div className="input-group">
        <label>Cấp độ (0-5)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={5}
          value={levelInput}
          onChange={(e) => {
            const value = e.target.value;
            setLevelInput(value);
            validateLevel(value);
          }}
          onBlur={(e) => validateLevel(e.target.value)}
        />
        {levelError && (
          <div className={styles.levelError}>{levelError}</div>
        )}
        <div className={styles.levelHint}>
          Đặt cấp độ để điều chỉnh lịch ôn. 0 = thẻ mới; 5 = cấp cao nhất.
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={onCancel} className="btn btn-secondary">
          Hủy
        </button>
        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          disabled={!term.trim() || !definition.trim() || !!levelError || !levelInput.trim()}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

export default EditForm;
