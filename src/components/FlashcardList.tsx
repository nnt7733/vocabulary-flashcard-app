import React, { useCallback, useMemo, useState } from 'react';
import { Flashcard } from '../types';
import EditForm from './EditForm';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { calculateCardUrgency, sortCardsByUrgency } from '../utils/overdue';
import styles from './FlashcardList.module.css';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onUpdateCard: (updatedCard: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteAll: () => void;
}

const ITEM_HEIGHT = 180;
const LIST_HEIGHT = 500;
const LIST_WIDTH = 900;

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
  onToggleFavorite: (card: Flashcard) => void;
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
        <span className={`${styles.urgencyBadge} ${styles.urgencyDanger}`}>
          🚨 Quá hạn {urgency.overdueDays} ngày
        </span>
      );
    }

    if (urgency.isOverdue) {
      return (
        <span className={`${styles.urgencyBadge} ${styles.urgencyWarning}`}>
          ⚠️ Trễ {urgency.overdueDays} ngày
        </span>
      );
    }

    if (urgency.isDueSoon) {
      return (
        <span className={`${styles.urgencyBadge} ${styles.urgencyInfo}`}>
          ⏰ Còn {urgency.daysUntilDue} ngày để ôn
        </span>
      );
    }

    return null;
  };

  return (
    <div style={style} className={styles.listRow}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <button
              className={styles.favoriteBtn}
              onClick={() => data.onToggleFavorite(card)}
              title={card.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {card.isFavorite ? '⭐' : '☆'}
            </button>
            <span
              className={styles.levelBadge}
              style={{ background: isLearned ? '#10b981' : data.getLevelColor(card.currentLevel) }}
            >
              {isLearned ? 'Đã hoàn thành' : `Cấp ${card.currentLevel}`}
            </span>
            <span className={styles.statusText}>
              {isLearned ? 'Không cần ôn thêm' : `Ôn lại sau: ${data.getLevelText(card.currentLevel)}`}
            </span>
            {renderUrgencyBadge()}
          </div>
          <div className={styles.term}>
            {card.term}
          </div>
          <div className={styles.definition}>
            {card.definition}
          </div>
          <div className={styles.meta}>
            Tạo: {new Date(card.createdAt).toLocaleDateString('vi-VN')} • Lần ôn: {card.repetitions.length}
          </div>
        </div>
        <div className={styles.actions}>
          {isLearned ? (
            <>
              <button
                onClick={() => data.onRestore(card)}
                className={`${styles.actionButton} btn btn-secondary`}
              >
                🔄 Khôi phục
              </button>
              <button
                onClick={() => data.onDelete(card.id)}
                className={`${styles.actionButton} btn btn-danger`}
              >
                🗑️ Xóa
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => data.onEdit(card)}
                className={`${styles.actionButton} btn btn-secondary`}
              >
                ✏️ Sửa
              </button>
              <button
                onClick={() => data.onDelete(card.id)}
                className={`${styles.actionButton} btn btn-danger`}
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

  const handleToggleFavorite = useCallback((card: Flashcard) => {
    onUpdateCard({
      ...card,
      isFavorite: !card.isFavorite
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
      onToggleFavorite: handleToggleFavorite,
      getLevelColor,
      getLevelText,
      getUrgency: calculateCardUrgency
    }),
    [cardsToRender, handleEdit, handleDelete, handleRestore, handleToggleFavorite]
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
        <div className={styles.deleteConfirm}>
          <h3 className={styles.deleteConfirmTitle}>
            ⚠️ Xóa toàn bộ từ vựng
          </h3>
          <p className={styles.deleteConfirmText}>
            Bạn có chắc chắn muốn xóa <strong>{flashcards.length} từ vựng</strong>?<br/>
            Hành động này không thể hoàn tác!
          </p>
          <div className={styles.deleteConfirmActions}>
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
      <div className={styles.listContainer}>
        <h2 className={styles.listTitle}>
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
          <div className={styles.tabControls}>
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
              width={LIST_WIDTH}
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
