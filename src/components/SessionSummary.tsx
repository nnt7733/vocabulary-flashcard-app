import React from 'react';
import { Flashcard } from '../types';

interface SessionSummaryProps {
  correctCount: number;
  incorrectCount: number;
  incorrectCards: Flashcard[];
  durationMinutes: number;
  onReviewIncorrect: () => void;
  onFinish: () => void;
  onStudyAgain?: () => void;
  learningMode?: 'study' | 'test';
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  correctCount,
  incorrectCount,
  incorrectCards,
  durationMinutes,
  onReviewIncorrect,
  onFinish,
  onStudyAgain,
  learningMode = 'test'
}) => {
  const totalCards = correctCount + incorrectCount;
  const accuracy = Math.round((correctCount / totalCards) * 100) || 0;
  const formattedDuration = durationMinutes <= 0
    ? 'Dưới 0.1 phút'
    : durationMinutes >= 1
      ? `${durationMinutes.toFixed(1)} phút`
      : `${Math.round(durationMinutes * 60)} giây`;

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>
          {learningMode === 'study' ? '📖 Study Complete!' : '🎉 Test Complete!'}
        </h2>
        <p className="session-summary-subtitle">
          {learningMode === 'study' 
            ? `Đã xem ${totalCards} thẻ (chỉ học, chưa test)`
            : `Đã hoàn thành ${totalCards} thẻ từ vựng`}
        </p>
      </div>

      <div className="stats">
        <div className="stat-card summary-stat-card summary-stat-success">
          <div className="stat-number summary-stat-number-success">
            {correctCount}
          </div>
          <div className="stat-label">Thuộc rồi ✅</div>
        </div>
        <div className="stat-card summary-stat-card summary-stat-error">
          <div className="stat-number summary-stat-number-error">
            {incorrectCount}
          </div>
          <div className="stat-label">Chưa thuộc ❌</div>
        </div>
        <div className="stat-card summary-stat-card summary-stat-info">
          <div className="stat-number summary-stat-number-info">
            {accuracy}%
          </div>
          <div className="stat-label">Độ chính xác</div>
        </div>
        <div className="stat-card summary-stat-card summary-stat-purple">
          <div className="stat-number summary-stat-number-purple" style={{ fontSize: '20px' }}>
            {formattedDuration}
          </div>
          <div className="stat-label">Thời lượng phiên</div>
        </div>
      </div>

      {incorrectCards.length > 0 && (
        <div className="incorrect-cards-container">
          <h3 className="incorrect-cards-title">
            📝 Các từ cần ôn lại
          </h3>
          <div className="incorrect-cards-list">
            {incorrectCards.map((card, index) => (
              <div key={card.id} className="incorrect-card-item" style={{ 
                borderBottom: index < incorrectCards.length - 1 ? '1px solid var(--border-color)' : 'none'
              }}>
                <div className="incorrect-card-term">
                  {card.term}
                </div>
                <div className="incorrect-card-definition">
                  {card.definition}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="controls">
        {incorrectCards.length > 0 ? (
          <>
            <button onClick={onReviewIncorrect} className="btn btn-primary">
              📚 Ôn lại {incorrectCards.length} từ chưa thuộc
            </button>
            {onStudyAgain && (
              <button onClick={onStudyAgain} className="btn btn-secondary">
                🔄 Study lại set này
              </button>
            )}
            <button onClick={onFinish} className="btn btn-secondary">
              ✅ Hoàn thành
            </button>
          </>
        ) : (
          <>
            <button onClick={onFinish} className="btn btn-success">
              🎉 Hoàn thành - Bạn đã thuộc tất cả!
            </button>
            {onStudyAgain && (
              <button onClick={onStudyAgain} className="btn btn-secondary">
                🔄 Study lại set này
              </button>
            )}
          </>
        )}
      </div>

      {learningMode === 'test' && (
        <div className="learning-mechanism-info">
          <p className="learning-mechanism-text">
            💡 <strong>Cơ chế học tập:</strong>
          </p>
          <p className="learning-mechanism-text">
            • Trả lời <strong>đúng</strong> → Tăng 1 cấp độ
          </p>
          <p className="learning-mechanism-text">
            • Trả lời <strong>sai</strong> → Giảm 1 cấp độ
          </p>
          <p className="learning-mechanism-text">
            • Bỏ lỡ ôn tập <strong>3 ngày liên tiếp</strong> → Tự động giảm 1 cấp độ
          </p>
          <p className="learning-mechanism-text" style={{ marginBottom: 0 }}>
            • Sai <strong>2 lần liên tiếp</strong> → Reset về cấp 0
          </p>
        </div>
      )}

      {learningMode === 'study' && (
        <div className="learning-mechanism-info" style={{ background: 'var(--bg-secondary)' }}>
          <p className="learning-mechanism-text">
            📖 <strong>Study Mode:</strong> Phiên học này không ảnh hưởng đến tiến độ hay cấp độ của từ vựng.
          </p>
          <p className="learning-mechanism-text" style={{ marginBottom: 0 }}>
            Chỉ có <strong>Test Mode</strong> mới tăng cấp độ và đánh dấu từ đã học.
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionSummary;
