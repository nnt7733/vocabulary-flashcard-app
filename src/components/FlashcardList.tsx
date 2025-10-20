import React, { useState } from 'react';
import { Flashcard } from '../types';
import EditForm from './EditForm';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onUpdateCard: (updatedCard: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteAll: () => void;
}

const FlashcardList: React.FC<FlashcardListProps> = ({ 
  flashcards, 
  onUpdateCard, 
  onDeleteCard, 
  onDeleteAll 
}) => {
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEdit = (card: Flashcard) => {
    setEditingCard(card);
  };

  const handleSaveEdit = (updatedCard: Flashcard) => {
    onUpdateCard(updatedCard);
    setEditingCard(null);
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
  };

  const handleDelete = (cardId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa từ này?')) {
      onDeleteCard(cardId);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = () => {
    onDeleteAll();
    setShowDeleteConfirm(false);
  };

  const getLevelColor = (level: number) => {
    const colors = [
      '#ef4444', // Level 0 - Red
      '#f97316', // Level 1 - Orange
      '#eab308', // Level 2 - Yellow
      '#22c55e', // Level 3 - Green
      '#3b82f6', // Level 4 - Blue
      '#8b5cf6'  // Level 5 - Purple
    ];
    return colors[level] || '#6b7280';
  };

  const getLevelText = (level: number) => {
    const texts = [
      'Mới học',
      '1 ngày',
      '3 ngày',
      '7 ngày',
      '14 ngày',
      '28 ngày'
    ];
    return texts[level] || 'Không xác định';
  };

  if (editingCard) {
    return (
      <EditForm
        card={editingCard}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>
            ⚠️ Xóa toàn bộ từ vựng
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Bạn có chắc chắn muốn xóa <strong>{flashcards.length} từ vựng</strong>?<br/>
            Hành động này không thể hoàn tác!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button 
              onClick={confirmDeleteAll}
              className="btn btn-danger"
            >
              Xóa toàn bộ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>
          Quản lý từ vựng ({flashcards.length} từ)
        </h2>
        <button 
          onClick={handleDeleteAll}
          className="btn btn-danger"
          disabled={flashcards.length === 0}
        >
          🗑️ Xóa toàn bộ
        </button>
      </div>

      {flashcards.length === 0 ? (
        <div className="empty-state">
          <h3>Chưa có từ vựng nào</h3>
          <p>Hãy thêm một số từ vựng mới để bắt đầu học tập!</p>
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {flashcards.map((card, index) => (
            <div 
              key={card.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '12px',
                background: 'white'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    background: getLevelColor(card.currentLevel),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Cấp {card.currentLevel}
                  </span>
                  <span style={{ 
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    Ôn lại sau: {getLevelText(card.currentLevel)}
                  </span>
                </div>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {card.term}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {card.definition}
                </div>
                <div style={{ 
                  color: '#9ca3af', 
                  fontSize: '12px', 
                  marginTop: '8px' 
                }}>
                  Tạo: {new Date(card.createdAt).toLocaleDateString('vi-VN')} • 
                  Lần ôn: {card.repetitions.length}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleEdit(card)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  ✏️ Sửa
                </button>
                <button 
                  onClick={() => handleDelete(card.id)}
                  className="btn btn-danger"
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardList;
