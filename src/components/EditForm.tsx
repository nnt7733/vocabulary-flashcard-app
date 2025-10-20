import React, { useState } from 'react';
import { Flashcard } from '../types';

interface EditFormProps {
  card: Flashcard;
  onSave: (updatedCard: Flashcard) => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ card, onSave, onCancel }) => {
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);

  const handleSave = () => {
    if (term.trim() && definition.trim()) {
      const updatedCard: Flashcard = {
        ...card,
        term: term.trim(),
        definition: definition.trim()
      };
      onSave(updatedCard);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>Chỉnh sửa từ vựng</h2>
        <button 
          onClick={onCancel}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer',
            color: '#6b7280'
          }}
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
          min={0}
          max={5}
          value={card.currentLevel}
          onChange={(e) => {
            const level = Math.max(0, Math.min(5, Number(e.target.value)));
            // Cập nhật tạm trong state thô để khi lưu sẽ dùng giá trị mới
            (card as any).currentLevel = level;
          }}
        />
        <div style={{ color: '#6b7280', fontSize: '12px' }}>
          Đặt cấp độ để điều chỉnh lịch ôn. 0 = thẻ mới; 5 = cấp cao nhất.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button onClick={onCancel} className="btn btn-secondary">
          Hủy
        </button>
        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          disabled={!term.trim() || !definition.trim()}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

export default EditForm;
