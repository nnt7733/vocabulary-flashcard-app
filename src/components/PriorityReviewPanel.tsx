import React, { useMemo } from 'react';
import { Flashcard } from '../types';
import {
  DUE_SOON_THRESHOLD_DAYS,
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

    if (dueSoonCards.length > 0) {
      return {
        icon: '⏰',
        title: `${dueSoonCards.length} thẻ sắp đến hạn trong ${DUE_SOON_THRESHOLD_DAYS} ngày`,
        description: 'Ôn trước khi quá hạn để duy trì nhịp độ học tập ổn định.'
      };
    }

    return {
      icon: '🎉',
      title: 'Tuyệt vời! Không có thẻ ưu tiên nào',
      description: 'Tiếp tục duy trì lịch ôn tập đều đặn để giữ vững phong độ.'
    };
  }, [dueSoonCards.length, longOverdueCards.length, overdueCards.length]);

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
          <h2 style={{ marginBottom: '8px', color: '#1f2937' }}>{urgencyMessage.title}</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>{urgencyMessage.description}</p>
        </div>
      </div>

      {highlightedCards.length > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          background: '#f9fafb'
        }}>
          <h3 style={{ marginBottom: '12px', color: '#374151' }}>Thẻ nên ôn trước</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
            {highlightedCards.map(card => (
              <li
                key={card.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'white',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1f2937' }}>{card.term}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{card.statusLabel}</span>
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
