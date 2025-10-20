import React, { useState, useEffect } from 'react';
import { Flashcard, AppState } from '../types';
import { getCardsForReview, getStudyStats } from '../utils/spacedRepetition';
import ImportForm from './ImportForm';
import StudySession from './StudySession';
import SessionSummary from './SessionSummary';
import FlashcardList from './FlashcardList';

const FlashcardManager: React.FC = () => {
  const [state, setState] = useState<AppState>({
    flashcards: [],
    studySessions: [],
    currentCardIndex: 0,
    isFlipped: false,
    isStudying: false,
    showImportForm: false
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showFlashcardList, setShowFlashcardList] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    incorrectCards: Flashcard[];
    updatedCards: Flashcard[];
  } | null>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedFlashcards = localStorage.getItem('flashcards');
    const savedSessions = localStorage.getItem('studySessions');
    
    if (savedFlashcards) {
      const flashcards = JSON.parse(savedFlashcards).map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        nextReviewDate: new Date(card.nextReviewDate),
        repetitions: card.repetitions.map((rep: any) => ({
          ...rep,
          date: new Date(rep.date)
        }))
      }));
      setState(prev => ({ ...prev, flashcards }));
    }
    
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        date: new Date(session.date)
      }));
      setState(prev => ({ ...prev, studySessions: sessions }));
    }
  }, []);

  // Save data to localStorage whenever flashcards change
  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(state.flashcards));
  }, [state.flashcards]);

  useEffect(() => {
    localStorage.setItem('studySessions', JSON.stringify(state.studySessions));
  }, [state.studySessions]);

  const handleImport = (cards: { term: string; definition: string }[]) => {
    const newFlashcards: Flashcard[] = cards.map(card => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      term: card.term,
      definition: card.definition,
      createdAt: new Date(),
      repetitions: [],
      currentLevel: 0,
      nextReviewDate: new Date(), // New cards are immediately available
      isNew: true
    }));

    setState(prev => ({
      ...prev,
      flashcards: [...prev.flashcards, ...newFlashcards],
      showImportForm: false
    }));
  };

  const handleStartStudy = () => {
    const cardsToStudy = getCardsForReview(state.flashcards);
    if (cardsToStudy.length === 0) {
      alert('Không có thẻ nào cần ôn tập vào lúc này!');
      return;
    }
    setState(prev => ({ ...prev, isStudying: true }));
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

    setState(prev => ({
      ...prev,
      flashcards: updatedFlashcards,
      isStudying: false
    }));

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
    setState(prev => ({ ...prev, isStudying: false }));
    setShowSummary(false);
    setSessionResults(null);
  };

  const handleReviewIncorrect = () => {
    if (sessionResults && sessionResults.incorrectCards.length > 0) {
      setShowSummary(false);
      setState(prev => ({ ...prev, isStudying: true }));
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

    setState(prev => ({
      ...prev,
      studySessions: [...prev.studySessions, session]
    }));

    setShowSummary(false);
    setSessionResults(null);
  };

  const handleUpdateCard = (updatedCard: Flashcard) => {
    setState(prev => ({
      ...prev,
      flashcards: prev.flashcards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      )
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    setState(prev => ({
      ...prev,
      flashcards: prev.flashcards.filter(card => card.id !== cardId)
    }));
  };

  const handleDeleteAllCards = () => {
    setState(prev => ({
      ...prev,
      flashcards: []
    }));
  };

  const stats = getStudyStats(state.flashcards);
  const cardsForReview = getCardsForReview(state.flashcards);

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
          onClose={() => setState(prev => ({ ...prev, showImportForm: false }))}
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
                onClick={() => setState(prev => ({ ...prev, showImportForm: true }))}
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
                  onClick={() => setState(prev => ({ ...prev, showImportForm: true }))}
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
