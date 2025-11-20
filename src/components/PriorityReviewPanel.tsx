import React, { useMemo } from 'react';
import { Flashcard } from '../types';
import {
  LONG_OVERDUE_DAYS,
  calculateCardUrgency
} from '../utils/overdue';

interface PriorityReviewPanelProps {
  overdueCards: Flashcard[];
  longOverdueCards: Flashcard[];
  dueSoonCards: Flashcard[];
  topCards: Flashcard[];
  onStartReview: () => void;
  onOpenFlashcardList: () => void;
}

const PriorityReviewPanel: React.FC<PriorityReviewPanelProps> = ({
  overdueCards,
  longOverdueCards,
  dueSoonCards,
  topCards,
  onStartReview,
  onOpenFlashcardList
}) => {
  const urgencyMessage = useMemo(() => {
    if (longOverdueCards.length > 0) {
      return {
        icon: '🚨',
        title: `${longOverdueCards.length} thẻ quá hạn trên ${LONG_OVERDUE_DAYS} ngày`,
        description: 'Hãy ưu tiên xử lý ngay để tránh bị quên kiến thức quan trọng.'
      };
    }

    if (overdueCards.length > 0) {
      return {
        icon: '⚠️',
        title: `${overdueCards.length} thẻ đã quá hạn cần được ôn lại`,
        description: 'Hoàn thành các thẻ này trước khi chuyển sang nội dung mới.'
      };
    }

    return {
      icon: '🎉',
      title: 'Tuyệt vời! Không có thẻ quá hạn',
      description: 'Tiếp tục duy trì lịch ôn tập đều đặn để giữ vững phong độ.'
    };
  }, [longOverdueCards.length, overdueCards.length]);

  const highlightedCards = useMemo(() => {
    return topCards.map(card => {
      const urgency = calculateCardUrgency(card);
      let statusLabel = '';

      if (urgency.isLongOverdue) {
        statusLabel = `Quá hạn ${urgency.overdueDays} ngày`;
      } else if (urgency.isOverdue) {
        statusLabel = `Trễ ${urgency.overdueDays} ngày`;
      } else if (urgency.isDueSoon) {
        statusLabel = `Còn ${urgency.daysUntilDue} ngày`;
      } else if (card.isNew) {
        statusLabel = 'Thẻ mới';
      } else {
        statusLabel = 'Đúng lịch';
      }

      return {
        id: card.id,
        term: card.term,
        statusLabel
      };
    });
  }, [topCards]);

  const hasUrgentCards = longOverdueCards.length > 0 || overdueCards.length > 0 || dueSoonCards.length > 0;

  return (
    <div className="card" style={{ marginTop: '16px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px' }}>{urgencyMessage.icon}</div>
        <div>
          <h2 style={{ marginBottom: '8px' }}>{urgencyMessage.title}</h2>
          <p className="priority-description">{urgencyMessage.description}</p>
        </div>
      </div>

      {highlightedCards.length > 0 && (
        <div className="priority-cards-container">
          <h3 style={{ marginBottom: '12px' }}>Thẻ nên ôn trước</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
            {highlightedCards.map(card => (
              <li
                key={card.id}
                className="priority-card-item"
              >
                <span className="priority-card-term">{card.term}</span>
                <span className="priority-card-status">{card.statusLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onStartReview}
          className="btn btn-success"
          disabled={!hasUrgentCards}
          style={hasUrgentCards ? undefined : { opacity: 0.6, cursor: 'not-allowed' }}
        >
          Ôn thẻ ưu tiên
        </button>
        <button onClick={onOpenFlashcardList} className="btn btn-secondary">
          Xem danh sách thẻ
        </button>
      </div>
    </div>
  );
};

export default PriorityReviewPanel;
