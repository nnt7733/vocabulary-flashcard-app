import React, { useCallback, useMemo, useState } from 'react';
import { Flashcard } from '../types';
import EditForm from './EditForm';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { calculateCardUrgency, sortCardsByUrgency } from '../utils/overdue';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onUpdateCard: (updatedCard: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteAll: () => void;
}

const ITEM_HEIGHT = 180;
const LIST_HEIGHT = 500;

const LEVEL_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6'
];

const LEVEL_TEXTS = [
  'Mới học',
  '1 ngày',
  '3 ngày',
  '7 ngày',
  '14 ngày',
  '28 ngày'
];

const getLevelColor = (level: number) => LEVEL_COLORS[level] || '#6b7280';
const getLevelText = (level: number) => LEVEL_TEXTS[level] || 'Không xác định';

type ListData = {
  cards: Flashcard[];
  onEdit: (card: Flashcard) => void;
  onDelete: (cardId: string) => void;
  onRestore: (card: Flashcard) => void;
  getLevelColor: (level: number) => string;
  getLevelText: (level: number) => string;
  getUrgency: (card: Flashcard) => ReturnType<typeof calculateCardUrgency>;
};

const FlashcardRow: React.FC<ListChildComponentProps<ListData>> = ({ index, style, data }) => {
  const card = data.cards[index];

  if (!card) {
    return null;
  }

  const isLearned = card.status === 'learned';
  const urgency = data.getUrgency(card);

  const renderUrgencyBadge = () => {
    if (isLearned) {
      return null;
    }

    if (urgency.isLongOverdue) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '4px 8px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          🚨 Quá hạn {urgency.overdueDays} ngày
        </span>
      );
    }

    if (urgency.isOverdue) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#fef3c7',
            color: '#b45309',
            padding: '4px 8px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          ⚠️ Trễ {urgency.overdueDays} ngày
        </span>
      );
    }

    if (urgency.isDueSoon) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '4px 8px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          ⏰ Còn {urgency.daysUntilDue} ngày để ôn
        </span>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        ...style,
        padding: '8px 0'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: 'white',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                background: isLearned ? '#10b981' : data.getLevelColor(card.currentLevel),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {isLearned ? 'Đã hoàn thành' : `Cấp ${card.currentLevel}`}
            </span>
            <span
              style={{
                color: '#6b7280',
                fontSize: '14px'
              }}
            >
              {isLearned ? 'Không cần ôn thêm' : `Ôn lại sau: ${data.getLevelText(card.currentLevel)}`}
            </span>
            {renderUrgencyBadge()}
          </div>
          <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
            {card.term}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            {card.definition}
          </div>
          <div
            style={{
              color: '#9ca3af',
              fontSize: '12px',
              marginTop: '8px'
            }}
          >
            Tạo: {new Date(card.createdAt).toLocaleDateString('vi-VN')} • Lần ôn: {card.repetitions.length}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isLearned ? (
            <>
              <button
                onClick={() => data.onRestore(card)}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                🔄 Khôi phục
              </button>
              <button
                onClick={() => data.onDelete(card.id)}
                className="btn btn-danger"
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                🗑️ Xóa
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => data.onEdit(card)}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                ✏️ Sửa
              </button>
              <button
                onClick={() => data.onDelete(card.id)}
                className="btn btn-danger"
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                🗑️ Xóa
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const FlashcardList: React.FC<FlashcardListProps> = ({
  flashcards,
  onUpdateCard,
  onDeleteCard,
  onDeleteAll
}) => {
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'learned'>('active');

  const handleEdit = useCallback((card: Flashcard) => {
    setEditingCard(card);
  }, []);

  const handleSaveEdit = useCallback((updatedCard: Flashcard) => {
    onUpdateCard(updatedCard);
    setEditingCard(null);
  }, [onUpdateCard]);

  const handleCancelEdit = useCallback(() => {
    setEditingCard(null);
  }, []);

  const handleDelete = useCallback((cardId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa từ này?')) {
      onDeleteCard(cardId);
    }
  }, [onDeleteCard]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleRestore = useCallback((card: Flashcard) => {
    onUpdateCard({
      ...card,
      status: 'active',
      currentLevel: 0,
      nextReviewDate: new Date(),
      isNew: false
    });
  }, [onUpdateCard]);

  const confirmDeleteAll = useCallback(() => {
    onDeleteAll();
    setShowDeleteConfirm(false);
  }, [onDeleteAll]);

  const activeCards = useMemo(
    () => flashcards.filter(card => card.status !== 'learned'),
    [flashcards]
  );

  const sortedActiveCards = useMemo(
    () => sortCardsByUrgency(activeCards),
    [activeCards]
  );

  const learnedCards = useMemo(
    () => flashcards.filter(card => card.status === 'learned'),
    [flashcards]
  );

  const cardsToRender = activeTab === 'active' ? sortedActiveCards : learnedCards;

  const listData = useMemo<ListData>(
    () => ({
      cards: cardsToRender,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onRestore: handleRestore,
      getLevelColor,
      getLevelText,
      getUrgency: calculateCardUrgency
    }),
    [cardsToRender, handleEdit, handleDelete, handleRestore]
  );

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
          Quản lý từ vựng ({activeCards.length} đang học • {learnedCards.length} đã hoàn thành)
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
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('active')}
              className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Đang học ({activeCards.length})
            </button>
            <button
              onClick={() => setActiveTab('learned')}
              className={`btn ${activeTab === 'learned' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Đã hoàn thành ({learnedCards.length})
            </button>
          </div>

          {cardsToRender.length === 0 ? (
            <div className="empty-state">
              <h3>
                {activeTab === 'active'
                  ? 'Tất cả thẻ đang hoạt động đã được chuyển sang mục hoàn thành'
                  : 'Chưa có thẻ nào hoàn thành'}
              </h3>
              <p>
                {activeTab === 'active'
                  ? 'Hãy thêm thẻ mới hoặc khôi phục từ mục hoàn thành để tiếp tục học.'
                  : 'Ôn tập các thẻ thường xuyên để chuyển sang trạng thái hoàn thành!'}
              </p>
            </div>
          ) : (
            <List
              height={LIST_HEIGHT}
              itemCount={cardsToRender.length}
              itemSize={ITEM_HEIGHT}
              itemData={listData}
              overscanCount={4}
            >
              {FlashcardRow}
            </List>
          )}
        </>
      )}
    </div>
  );
};

export default FlashcardList;
