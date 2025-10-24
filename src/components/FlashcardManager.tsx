import React, { useMemo, useState } from 'react';
import { Flashcard } from '../types';
import { getCardsForReview, getStudyStats, getTodayNewCards } from '../utils/spacedRepetition';
import ImportForm from './ImportForm';
import StudySession, { StudySessionResult } from './StudySession';
import SessionSummary from './SessionSummary';
import FlashcardList from './FlashcardList';
import { useAppContext } from '../context/AppContext';
import LearningProgressTable from './LearningProgressTable';
import {
  getDueSoonCards,
  getLongOverdueCards,
  getOverdueCards,
  sortCardsByUrgency
} from '../utils/overdue';
import PriorityReviewPanel from './PriorityReviewPanel';
import OverdueTrendChart from './OverdueTrendChart';
import SettingsForm from './SettingsForm';

const FlashcardManager: React.FC = () => {
  const { state, dispatch, storageError, clearStorageError } = useAppContext();
  const [showSummary, setShowSummary] = useState(false);
  const [showFlashcardList, setShowFlashcardList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    incorrectCards: Flashcard[];
    durationMinutes: number;
    startedAt: Date;
    finishedAt: Date;
    overdueReviewed: number;
  } | null>(null);
  const [currentSessionCards, setCurrentSessionCards] = useState<Flashcard[] | null>(null);

  const activeFlashcards = useMemo(
    () => state.flashcards.filter(card => card.status !== 'learned'),
    [state.flashcards]
  );

  const learnedFlashcards = useMemo(
    () => state.flashcards.filter(card => card.status === 'learned'),
    [state.flashcards]
  );

  const stats = useMemo(() => getStudyStats(activeFlashcards), [activeFlashcards]);
  const overdueCards = useMemo(() => getOverdueCards(activeFlashcards), [activeFlashcards]);
  const longOverdueCards = useMemo(() => getLongOverdueCards(activeFlashcards), [activeFlashcards]);
  const dueSoonCards = useMemo(() => getDueSoonCards(activeFlashcards), [activeFlashcards]);
  const cardsForReview = useMemo(
    () => sortCardsByUrgency(getCardsForReview(activeFlashcards, { excludeNewToday: true })),
    [activeFlashcards]
  );
  const todaysNewCards = useMemo(
    () => getTodayNewCards(activeFlashcards),
    [activeFlashcards]
  );
  const priorityCards = useMemo(() => {
    const combined = [...longOverdueCards, ...overdueCards, ...dueSoonCards];
    const unique = new Map<string, Flashcard>();
    combined.forEach(card => {
      if (!unique.has(card.id)) {
        unique.set(card.id, card);
      }
    });
    return sortCardsByUrgency(Array.from(unique.values())).slice(0, 5);
  }, [dueSoonCards, longOverdueCards, overdueCards]);

  const handleImport = (cards: { term: string; definition: string }[]) => {
    if (!cards.length) return;
    dispatch({ type: 'IMPORT_FLASHCARDS', payload: { cards } });
  };

  const handleStartStudy = (mode: 'review' | 'newToday') => {
    const cardsToStudy = mode === 'review'
      ? cardsForReview
      : todaysNewCards;

    if (cardsToStudy.length === 0) {
      if (mode === 'review') {
        alert('Không có thẻ nào cần ôn tập vào lúc này!');
      } else {
        alert('Hôm nay bạn chưa thêm thẻ mới nào để học.');
      }
      return;
    }

    setCurrentSessionCards(cardsToStudy);
    dispatch({ type: 'START_STUDY' });
  };

  const handleStudyComplete = ({ updatedCards, incorrectCards, stats, durationMs, startedAt, finishedAt, overdueReviewed }: StudySessionResult) => {
    const updatedFlashcards = state.flashcards.map(card => {
      const updated = updatedCards.find(uc => uc.id === card.id);
      return updated || card;
    });

    dispatch({ type: 'COMPLETE_STUDY', payload: { updatedCards: updatedFlashcards } });

    const durationMinutes = Math.round((durationMs / 60000) * 100) / 100;

    setSessionResults({
      correctCount: stats.correct,
      incorrectCount: stats.incorrect,
      incorrectCards,
      durationMinutes,
      startedAt,
      finishedAt,
      overdueReviewed
    });
    setShowSummary(true);
    setCurrentSessionCards(null);
  };

  const handleExitStudy = () => {
    dispatch({ type: 'EXIT_STUDY' });
    setShowSummary(false);
    setSessionResults(null);
    setCurrentSessionCards(null);
  };

  const handleReviewIncorrect = () => {
    if (sessionResults && sessionResults.incorrectCards.length > 0) {
      setShowSummary(false);
      setCurrentSessionCards(sessionResults.incorrectCards);
      dispatch({ type: 'START_STUDY' });
    }
  };

  const handleFinishSession = () => {
    const now = sessionResults?.finishedAt ?? new Date();
    const cardsStudied = (sessionResults?.correctCount || 0) + (sessionResults?.incorrectCount || 0);
    const session = {
      id: Date.now().toString(),
      date: now,
      cardsStudied,
      correctAnswers: sessionResults?.correctCount || 0,
      totalTime: sessionResults ? Number(sessionResults.durationMinutes.toFixed(2)) : 0,
      overdueReviews: sessionResults?.overdueReviewed || 0
    };

    dispatch({ type: 'ADD_STUDY_SESSION', payload: session });

    setShowSummary(false);
    setSessionResults(null);
    setCurrentSessionCards(null);
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

  const storageBanner = storageError ? (
    <div className="storage-alert" role="alert">
      <div>
        <strong>⚠️ Không thể lưu dữ liệu.</strong>
        <div>{storageError}</div>
      </div>
      <button type="button" className="storage-alert__close" onClick={clearStorageError}>
        Đóng
      </button>
    </div>
  ) : null;

  if (showSettings) {
    return (
      <div className="container">
        <div className="header">
          <h1>📚 Học Từ Vựng</h1>
          <p>Hệ thống học từ vựng với spaced repetition</p>
        </div>
        {storageBanner}
        <SettingsForm onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (showSummary && sessionResults) {
    return (
      <div className="container">
        <div className="header">
          <h1>📚 Học Từ Vựng</h1>
          <p>Hệ thống học từ vựng với spaced repetition</p>
        </div>
        {storageBanner}
        <SessionSummary
          correctCount={sessionResults.correctCount}
          incorrectCount={sessionResults.incorrectCount}
          incorrectCards={sessionResults.incorrectCards}
          durationMinutes={sessionResults.durationMinutes}
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
        {storageBanner}
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
      : currentSessionCards ?? cardsForReview;

    return (
      <>
        {storageBanner}
        <StudySession
          cards={cardsToStudy}
          onComplete={handleStudyComplete}
          onExit={handleExitStudy}
        />
      </>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📚 Học Từ Vựng</h1>
        <p>Hệ thống học từ vựng với spaced repetition</p>
      </div>

      {storageBanner}

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
              <div className="stat-number">{stats.newToday}</div>
              <div className="stat-label">Mới hôm nay</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.due}</div>
              <div className="stat-label">Cần ôn tập</div>
            </div>
          <div className="stat-card">
              <div className="stat-number">{state.studySessions.length}</div>
              <div className="stat-label">Phiên học</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{learnedFlashcards.length}</div>
              <div className="stat-label">Đã hoàn thành</div>
            </div>
          </div>

          <OverdueTrendChart sessions={state.studySessions} />

          <PriorityReviewPanel
            overdueCards={overdueCards}
            longOverdueCards={longOverdueCards}
            dueSoonCards={dueSoonCards}
            topCards={priorityCards}
            onStartReview={() => handleStartStudy('review')}
            onOpenFlashcardList={() => setShowFlashcardList(true)}
          />

          <LearningProgressTable sessions={state.studySessions} />

          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>
                Sẵn sàng học tập?
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {cardsForReview.length > 0
                  ? `Bạn có ${cardsForReview.length} thẻ cần ôn tập`
                  : 'Tuyệt vời! Bạn đã hoàn thành tất cả thẻ cần ôn tập hôm nay.'}
              </p>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {todaysNewCards.length > 0
                  ? `Hôm nay có ${todaysNewCards.length} thẻ mới chờ bạn khám phá.`
                  : 'Bạn chưa thêm thẻ mới nào trong ngày hôm nay.'}
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
                onClick={() => handleStartStudy('newToday')}
                className="btn btn-secondary"
                disabled={todaysNewCards.length === 0}
                title={todaysNewCards.length === 0 ? 'Chưa có thẻ mới nào trong ngày hôm nay' : 'Học các thẻ mới vừa thêm'}
                style={todaysNewCards.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                🌱 Học từ mới hôm nay
              </button>
              <button
                onClick={() => handleStartStudy('review')}
                className="btn btn-success"
                disabled={cardsForReview.length === 0}
                title={cardsForReview.length === 0 ? 'Không có thẻ cần ôn hôm nay' : 'Bắt đầu học'}
                style={cardsForReview.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                🚀 Bắt đầu học
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-secondary"
              >
                ⚙️ Cài đặt
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
