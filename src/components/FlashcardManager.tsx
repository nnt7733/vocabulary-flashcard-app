import React, { useMemo, useState } from 'react';
import { Flashcard } from '../types';
import { getCardsForReview, getStudyStats } from '../utils/spacedRepetition';
import ImportForm from './ImportForm';
import StudySession from './StudySession';
import SessionSummary from './SessionSummary';
import FlashcardList from './FlashcardList';
import { useAppContext } from '../context/AppContext';

const FlashcardManager: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [showSummary, setShowSummary] = useState(false);
  const [showFlashcardList, setShowFlashcardList] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    incorrectCards: Flashcard[];
    updatedCards: Flashcard[];
  } | null>(null);

  const handleImport = (cards: { term: string; definition: string }[]) => {
    if (!cards.length) return;
    dispatch({ type: 'IMPORT_FLASHCARDS', payload: { cards } });
  };

  const handleStartStudy = () => {
    const cardsToStudy = getCardsForReview(state.flashcards);
    if (cardsToStudy.length === 0) {
      alert('Không có thẻ nào cần ôn tập vào lúc này!');
      return;
    }
    dispatch({ type: 'START_STUDY' });
  };

  const handleStudyComplete = (updatedCards: Flashcard[], incorrectCards: Flashcard[]) => {
    // Count correct and incorrect answers from the last repetition
    const correctCount = updatedCards.filter(card => 
      card.repetitions.length > 0 && 
      card.repetitions[card.repetitions.length - 1].correct
    ).length;
    const incorrectCount = updatedCards.length - correctCount;

    // Update flashcards with new data
    const updatedFlashcards = state.flashcards.map(card => {
      const updated = updatedCards.find(uc => uc.id === card.id);
      return updated || card;
    });

    dispatch({ type: 'COMPLETE_STUDY', payload: { updatedCards: updatedFlashcards } });

    // Show summary
    setSessionResults({
      correctCount,
      incorrectCount,
      incorrectCards,
      updatedCards: updatedFlashcards
    });
    setShowSummary(true);
  };

  const handleExitStudy = () => {
    dispatch({ type: 'EXIT_STUDY' });
    setShowSummary(false);
    setSessionResults(null);
  };

  const handleReviewIncorrect = () => {
    if (sessionResults && sessionResults.incorrectCards.length > 0) {
      setShowSummary(false);
      dispatch({ type: 'START_STUDY' });
    }
  };

  const handleFinishSession = () => {
    const now = new Date();
    const session = {
      id: Date.now().toString(),
      date: now,
      cardsStudied: (sessionResults?.correctCount || 0) + (sessionResults?.incorrectCount || 0),
      correctAnswers: sessionResults?.correctCount || 0,
      totalTime: 0
    };

    dispatch({ type: 'ADD_STUDY_SESSION', payload: session });

    setShowSummary(false);
    setSessionResults(null);
  };

  const handleUpdateCard = (updatedCard: Flashcard) => {
    dispatch({ type: 'UPDATE_FLASHCARD', payload: updatedCard });
  };

  const handleDeleteCard = (cardId: string) => {
    dispatch({ type: 'DELETE_FLASHCARD', payload: cardId });
  };

  const handleDeleteAllCards = () => {
    dispatch({ type: 'DELETE_ALL_FLASHCARDS' });
  };

  const stats = useMemo(() => getStudyStats(state.flashcards), [state.flashcards]);
  const cardsForReview = useMemo(() => getCardsForReview(state.flashcards), [state.flashcards]);

  if (showSummary && sessionResults) {
    return (
      <div className="container">
        <div className="header">
          <h1>📚 Học Từ Vựng</h1>
          <p>Hệ thống học từ vựng với spaced repetition</p>
        </div>
        <SessionSummary
          correctCount={sessionResults.correctCount}
          incorrectCount={sessionResults.incorrectCount}
          incorrectCards={sessionResults.incorrectCards}
          onReviewIncorrect={handleReviewIncorrect}
          onFinish={handleFinishSession}
        />
      </div>
    );
  }

  if (showFlashcardList) {
    return (
      <div className="container">
        <div className="header">
          <h1>📚 Học Từ Vựng</h1>
          <p>Hệ thống học từ vựng với spaced repetition</p>
        </div>
        <FlashcardList
          flashcards={state.flashcards}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onDeleteAll={handleDeleteAllCards}
        />
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            onClick={() => setShowFlashcardList(false)}
            className="btn btn-secondary"
          >
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (state.isStudying) {
    const cardsToStudy = sessionResults && sessionResults.incorrectCards.length > 0 
      ? sessionResults.incorrectCards 
      : cardsForReview;
      
    return (
      <StudySession
        cards={cardsToStudy}
        onComplete={handleStudyComplete}
        onExit={handleExitStudy}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📚 Học Từ Vựng</h1>
        <p>Hệ thống học từ vựng với spaced repetition</p>
      </div>

      {state.showImportForm ? (
        <ImportForm
          onImport={handleImport}
          onClose={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: false })}
        />
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Tổng thẻ</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.new}</div>
              <div className="stat-label">Thẻ mới</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.due}</div>
              <div className="stat-label">Cần ôn tập</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{state.studySessions.length}</div>
              <div className="stat-label">Phiên học</div>
            </div>
          </div>

          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>
                Sẵn sàng học tập?
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {cardsForReview.length > 0 
                  ? `Bạn có ${cardsForReview.length} thẻ cần ôn tập`
                  : 'Tuyệt vời! Bạn đã hoàn thành tất cả thẻ cần ôn tập hôm nay.'
                }
              </p>
            </div>

            <div className="controls">
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: true })}
                className="btn btn-primary"
              >
                ➕ Thêm từ mới
              </button>
              <button
                onClick={() => setShowFlashcardList(true)}
                className="btn btn-secondary"
                disabled={state.flashcards.length === 0}
              >
                📝 Quản lý từ vựng
              </button>
              <button
                onClick={handleStartStudy}
                className="btn btn-success"
                disabled={cardsForReview.length === 0}
                title={cardsForReview.length === 0 ? 'Không có thẻ cần ôn hôm nay' : 'Bắt đầu học'}
                style={cardsForReview.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                🚀 Bắt đầu học
              </button>
            </div>
          </div>

          {state.flashcards.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>
                Thống kê theo cấp độ
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div key={level} style={{ 
                    background: '#f9fafb', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    textAlign: 'center',
                    border: level === '0' ? '2px solid #4f46e5' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4f46e5' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Cấp {level}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.flashcards.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <h3>Chưa có thẻ nào</h3>
                <p>Hãy thêm một số từ vựng mới để bắt đầu học tập!</p>
                <button
                  onClick={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: true })}
                  className="btn btn-primary"
                >
                  Thêm từ mới
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlashcardManager;
