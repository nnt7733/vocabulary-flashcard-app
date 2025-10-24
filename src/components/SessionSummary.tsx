import React from 'react';
import { Flashcard } from '../types';

interface SessionSummaryProps {
  correctCount: number;
  incorrectCount: number;
  incorrectCards: Flashcard[];
  durationMinutes: number;
  onReviewIncorrect: () => void;
  onFinish: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  correctCount,
  incorrectCount,
  incorrectCards,
  durationMinutes,
  onReviewIncorrect,
  onFinish
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
        <h2 style={{ fontSize: '32px', color: '#1f2937', marginBottom: '16px' }}>
          🎉 Hoàn thành phiên học!
        </h2>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>
          Bạn đã hoàn thành {totalCards} thẻ từ vựng
        </p>
      </div>

      <div className="stats">
        <div className="stat-card" style={{ background: '#d1fae5' }}>
          <div className="stat-number" style={{ color: '#059669' }}>
            {correctCount}
          </div>
          <div className="stat-label">Thuộc rồi ✅</div>
        </div>
        <div className="stat-card" style={{ background: '#fee2e2' }}>
          <div className="stat-number" style={{ color: '#dc2626' }}>
            {incorrectCount}
          </div>
          <div className="stat-label">Chưa thuộc ❌</div>
        </div>
        <div className="stat-card" style={{ background: '#dbeafe' }}>
          <div className="stat-number" style={{ color: '#2563eb' }}>
            {accuracy}%
          </div>
          <div className="stat-label">Độ chính xác</div>
        </div>
        <div className="stat-card" style={{ background: '#ede9fe' }}>
          <div className="stat-number" style={{ color: '#7c3aed', fontSize: '20px' }}>
            {formattedDuration}
          </div>
          <div className="stat-label">Thời lượng phiên</div>
        </div>
      </div>

      {incorrectCards.length > 0 && (
        <div style={{
          background: '#fef3c7', 
          padding: '24px', 
          borderRadius: '12px', 
          marginTop: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            color: '#92400e', 
            marginBottom: '16px',
            fontSize: '20px',
            textAlign: 'center'
          }}>
            📝 Các từ cần ôn lại
          </h3>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            background: 'white',
            borderRadius: '8px',
            padding: '16px'
          }}>
            {incorrectCards.map((card, index) => (
              <div key={card.id} style={{ 
                padding: '8px',
                borderBottom: index < incorrectCards.length - 1 ? '1px solid #e5e7eb' : 'none',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>
                  {card.term}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
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
            <button onClick={onFinish} className="btn btn-secondary">
              ✅ Hoàn thành
            </button>
          </>
        ) : (
          <button onClick={onFinish} className="btn btn-success">
            🎉 Hoàn thành - Bạn đã thuộc tất cả!
          </button>
        )}
      </div>

      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        background: '#f3f4f6',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', marginBottom: '8px' }}>
          💡 <strong>Cơ chế học tập:</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
          • Trả lời <strong>đúng</strong> → Tăng 1 cấp độ
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
          • Trả lời <strong>sai</strong> → Giảm 1 cấp độ
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
          • Bỏ lỡ ôn tập <strong>3 ngày liên tiếp</strong> → Tự động giảm 1 cấp độ
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          • Sai <strong>2 lần liên tiếp</strong> → Reset về cấp 0
        </p>
      </div>
    </div>
  );
};

export default SessionSummary;
