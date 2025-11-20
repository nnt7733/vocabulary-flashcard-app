import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flashcard, StudySession as StudySessionRecord } from '../types';
import { getCardsForReview, getStudyStats } from '../utils/spacedRepetition';
import ImportForm from './ImportForm';
import StudySession, { StudySessionResult } from './StudySession';
import SessionSummary from './SessionSummary';
import FlashcardList from './FlashcardList';
import { useAppContext } from '../context/AppContext';
import {
  getDueSoonCards,
  getLongOverdueCards,
  getOverdueCards,
  sortCardsByUrgency,
  calculateCardUrgency
} from '../utils/overdue';
import PriorityReviewPanel from './PriorityReviewPanel';
import SettingsForm from './SettingsForm';
import FolderList from './FolderList';
import './FolderList.css';

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
  const [uiMessage, setUiMessage] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!uiMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setUiMessage(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [uiMessage]);

  // Get flashcards based on selected set or all sets
  const filteredFlashcards = useMemo(() => {
    if (state.selectedSetId) {
      return state.flashcards.filter(card => card.setId === state.selectedSetId);
    }
    return state.flashcards;
  }, [state.flashcards, state.selectedSetId]);

  const activeFlashcards = useMemo(
    () => filteredFlashcards.filter(card => card.status !== 'learned'),
    [filteredFlashcards]
  );

  const learnedFlashcards = useMemo(
    () => state.flashcards.filter(card => card.status === 'learned'),
    [state.flashcards]
  );

  const stats = useMemo(() => getStudyStats(activeFlashcards), [activeFlashcards]);
  const overdueCards = useMemo(() => getOverdueCards(activeFlashcards), [activeFlashcards]);
  const longOverdueCards = useMemo(() => getLongOverdueCards(activeFlashcards), [activeFlashcards]);
  const dueSoonCards = useMemo(() => getDueSoonCards(activeFlashcards), [activeFlashcards]);
  // Cards for review excluding new cards today (for stats display)
  const cardsForReview = useMemo(
    () => sortCardsByUrgency(getCardsForReview(activeFlashcards, { excludeNewToday: true })),
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
    if (!state.selectedSetId) {
      setUiMessage({
        type: 'warning',
        text: 'Vui lòng chọn một set để thêm từ vựng!'
      });
      return;
    }
    dispatch({ type: 'IMPORT_FLASHCARDS', payload: { cards, setId: state.selectedSetId } });
    setUiMessage({
      type: 'success',
      text: `Đã thêm ${cards.length} từ vựng vào set!`
    });
  };

  // Quick Study: Get all active cards, sorted by urgency then oldest first
  const getQuickStudyCards = useMemo(() => {
    const allActiveCards = state.flashcards.filter(card => card.status !== 'learned');
    
    if (allActiveCards.length === 0) {
      return [];
    }

    // Prioritize by urgency, then oldest first
    let cardsForReview = getCardsForReview(allActiveCards, { excludeNewToday: true });
    
    // If no cards available, include all cards
    if (cardsForReview.length === 0) {
      cardsForReview = allActiveCards;
    }
    
    // Sort by urgency first (for spaced repetition optimization), then by oldest first
    return [...cardsForReview].sort((a, b) => {
      const urgencyA = calculateCardUrgency(a);
      const urgencyB = calculateCardUrgency(b);
      
      // First priority: urgency score (higher = more urgent)
      if (urgencyA.urgencyScore !== urgencyB.urgencyScore) {
        return urgencyB.urgencyScore - urgencyA.urgencyScore;
      }
      
      // Second priority: next review date (earlier = more urgent)
      const nextReviewA = a.nextReviewDate instanceof Date ? a.nextReviewDate : new Date(a.nextReviewDate);
      const nextReviewB = b.nextReviewDate instanceof Date ? b.nextReviewDate : new Date(b.nextReviewDate);
      if (nextReviewA.getTime() !== nextReviewB.getTime()) {
        return nextReviewA.getTime() - nextReviewB.getTime();
      }
      
      // Third priority: oldest words first (for Quick Study requirement)
      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      
      // Final tiebreaker: alphabetically
      return a.term.localeCompare(b.term);
    });
  }, [state.flashcards]);

  const handleStartStudy = (mode: 'set' | 'quick') => {
    let cardsToStudy: Flashcard[] = [];

    if (mode === 'set') {
      if (!state.selectedSetId) {
        setUiMessage({
          type: 'warning',
          text: 'Vui lòng chọn một set để học!'
        });
        return;
      }
      // Always allow studying a set - get all active cards in the set
      cardsToStudy = filteredFlashcards.filter(card => card.status !== 'learned');
    } else {
      // Quick Study mode - get all active cards (with optional shuffle)
      cardsToStudy = getQuickStudyCards;
    }

    if (cardsToStudy.length === 0) {
      setUiMessage({
        type: 'info',
        text: mode === 'set'
          ? 'Không có thẻ nào trong set này. Hãy thêm thẻ mới!'
          : 'Không có thẻ nào để học. Hãy thêm thẻ mới vào các set!'
      });
      return;
    }

    setUiMessage(null);
    setCurrentSessionCards(cardsToStudy);
    dispatch({ 
      type: 'START_STUDY', 
      payload: { 
        mode, 
        setId: mode === 'set' ? (state.selectedSetId ?? undefined) : undefined 
      } 
    });
  };

  const handleStudyComplete = ({ updatedCards, incorrectCards, stats, durationMs, startedAt, finishedAt, overdueReviewed }: StudySessionResult) => {
    const updatedFlashcards = state.flashcards.map(card => {
      const updated = updatedCards.find(uc => uc.id === card.id);
      return updated || card;
    });

    // Update word counts for all sets
    const updatedSets = state.vocabularySets.map(set => {
      const wordCount = updatedFlashcards.filter(c => c.setId === set.id && c.status !== 'learned').length;
      return { ...set, wordCount, updatedAt: new Date() };
    });

    // Update sets first
    updatedSets.forEach(set => {
      dispatch({ type: 'UPDATE_VOCABULARY_SET', payload: set });
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
    // Word count will be updated automatically in reducer
  };

  const handleDeleteCard = (cardId: string) => {
    dispatch({ type: 'DELETE_FLASHCARD', payload: cardId });
    // Word count will be updated automatically in reducer
  };

  const handleDeleteAllCards = () => {
    dispatch({ type: 'DELETE_ALL_FLASHCARDS' });
  };

  const generateId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const reviveFlashcardFromBackup = (card: any): Flashcard => {
    // If no setId, assign to first set or create a default set
    let setId = card?.setId;
    if (!setId && state.vocabularySets.length > 0) {
      setId = state.vocabularySets[0].id;
    } else if (!setId && state.folders.length === 0) {
      // Create a default folder and set for migration
      const defaultFolder = {
        id: generateId(),
        name: 'Default Folder',
        createdAt: new Date(),
        updatedAt: new Date(),
        setCount: 1
      };
      
      const defaultSet = {
        id: generateId(),
        name: 'Default Set',
        folderId: defaultFolder.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 0
      };
      
      dispatch({ type: 'CREATE_FOLDER', payload: defaultFolder });
      dispatch({ type: 'CREATE_VOCABULARY_SET', payload: defaultSet });
      setId = defaultSet.id;
    }

    return {
      id: typeof card?.id === 'string' ? card.id : generateId(),
      term: typeof card?.term === 'string' ? card.term : '',
      definition: typeof card?.definition === 'string' ? card.definition : '',
      createdAt: card?.createdAt ? new Date(card.createdAt) : new Date(),
      repetitions: Array.isArray(card?.repetitions)
        ? card.repetitions.map((rep: any) => ({
            ...rep,
            level: typeof rep?.level === 'number' ? rep.level : 0,
            date: rep?.date ? new Date(rep.date) : new Date(),
            correct: Boolean(rep?.correct),
            responseTime: typeof rep?.responseTime === 'number' ? rep.responseTime : 0
          }))
        : [],
      currentLevel: typeof card?.currentLevel === 'number' ? card.currentLevel : 0,
      nextReviewDate: card?.nextReviewDate ? new Date(card.nextReviewDate) : new Date(),
      isNew: Boolean(card?.isNew),
      status: card?.status === 'learned' ? 'learned' : 'active',
      setId: setId || ''
    };
  };

  const reviveSessionFromBackup = (session: any): StudySessionRecord => ({
    id: typeof session?.id === 'string' ? session.id : generateId(),
    date: session?.date ? new Date(session.date) : new Date(),
    cardsStudied: typeof session?.cardsStudied === 'number' ? session.cardsStudied : 0,
    correctAnswers: typeof session?.correctAnswers === 'number' ? session.correctAnswers : 0,
    totalTime: typeof session?.totalTime === 'number' ? session.totalTime : 0,
    overdueReviews: typeof session?.overdueReviews === 'number' ? session.overdueReviews : 0
  });

  const handleExportBackup = () => {
    if (state.flashcards.length === 0 && state.studySessions.length === 0) {
      setUiMessage({
        type: 'warning',
        text: 'Không có dữ liệu để xuất. Hãy thêm thẻ hoặc tạo phiên học trước khi sao lưu.'
      });
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      flashcards: state.flashcards,
      studySessions: state.studySessions
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setUiMessage({
      type: 'success',
      text: 'Đã xuất bản sao lưu JSON. Hãy lưu giữ tệp ở nơi an toàn!'
    });
  };

  const handleBackupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const input = event.target;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        if (!raw || typeof raw !== 'object') {
          throw new Error('Tệp không chứa dữ liệu hợp lệ.');
        }

        const restoredFlashcards = Array.isArray((raw as any).flashcards)
          ? (raw as any).flashcards
              .map((card: any) => reviveFlashcardFromBackup(card))
              .filter((card: Flashcard) => Boolean(card.term) && Boolean(card.definition))
          : [];
        const restoredSessions = Array.isArray((raw as any).studySessions)
          ? (raw as any).studySessions.map((session: any) => reviveSessionFromBackup(session))
          : [];

        dispatch({
          type: 'HYDRATE_FROM_STORAGE',
          payload: {
            flashcards: restoredFlashcards,
            studySessions: restoredSessions
          }
        });

        setUiMessage({
          type: 'success',
          text: `Đã nhập ${restoredFlashcards.length} thẻ và ${restoredSessions.length} phiên học từ bản sao lưu.`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể đọc tệp JSON.';
        setUiMessage({
          type: 'error',
          text: `Không thể nhập dữ liệu: ${message}`
        });
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      setUiMessage({
        type: 'error',
        text: 'Đã xảy ra lỗi khi đọc tệp sao lưu. Hãy thử lại với tệp khác.'
      });
      input.value = '';
    };

    reader.readAsText(file);
  };

  const handleImportBackup = () => {
    backupInputRef.current?.click();
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

  const notificationBanner = uiMessage ? (
    <div className={`inline-banner inline-banner--${uiMessage.type}`} role="status">
      <span>{uiMessage.text}</span>
      <button type="button" onClick={() => setUiMessage(null)} aria-label="Đóng thông báo">
        ×
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
        {notificationBanner}
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
        {notificationBanner}
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
        {notificationBanner}
        <FlashcardList
          flashcards={filteredFlashcards}
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
        {notificationBanner}
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
      {notificationBanner}

      {state.showImportForm ? (
        <ImportForm
          onImport={handleImport}
          onClose={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: false })}
        />
      ) : (
        <>
          <FolderList
            folders={state.folders}
            sets={state.vocabularySets}
            onSelectFolder={(folderId) => dispatch({ type: 'SET_SELECTED_FOLDER', payload: folderId || null })}
            onSelectSet={(setId) => dispatch({ type: 'SET_SELECTED_SET', payload: setId || null })}
            selectedFolderId={state.selectedFolderId}
            selectedSetId={state.selectedSetId}
            onShowImportForm={() => {
              if (!state.selectedSetId) {
                setUiMessage({
                  type: 'warning',
                  text: 'Vui lòng chọn một set để thêm từ vựng!'
                });
                return;
              }
              dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: true });
            }}
          />

          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ marginBottom: '16px' }}>
                🚀 Quick Study - Học tất cả sets
              </h2>
              <p className="study-ready-text">
                {state.flashcards.filter(c => c.status !== 'learned').length > 0
                  ? `Bạn có ${state.flashcards.filter(c => c.status !== 'learned').length} thẻ từ tất cả sets`
                  : 'Không có thẻ nào để học'}
              </p>
            </div>
            <div className="controls" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => handleStartStudy('quick')}
                className="btn btn-success"
                disabled={state.flashcards.filter(c => c.status !== 'learned').length === 0}
                title="Quick Study - Học từ cũ nhất từ tất cả sets"
              >
                🚀 Quick Study
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-secondary"
              >
                ⚙️ Cài đặt
              </button>
            </div>
          </div>

          {(overdueCards.length > 0 || longOverdueCards.length > 0) && (
            <PriorityReviewPanel
              overdueCards={overdueCards}
              longOverdueCards={longOverdueCards}
              dueSoonCards={[]}
              topCards={priorityCards}
              onStartReview={() => handleStartStudy('quick')}
              onOpenFlashcardList={() => setShowFlashcardList(true)}
            />
          )}

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
            <div className="stat-card">
              <div className="stat-number">{learnedFlashcards.length}</div>
              <div className="stat-label">Đã hoàn thành</div>
            </div>
          </div>

          {state.selectedSetId && (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '16px' }}>
                  📚 Học Set: {state.vocabularySets.find(s => s.id === state.selectedSetId)?.name || 'Unknown'}
                </h2>
                <p className="study-ready-text">
                  {filteredFlashcards.filter(c => c.status !== 'learned').length > 0
                    ? `Bạn có ${filteredFlashcards.filter(c => c.status !== 'learned').length} thẻ trong set này`
                    : 'Không có thẻ nào trong set này'}
                </p>
              </div>

              <div className="controls">
                <button
                  onClick={() => setShowFlashcardList(true)}
                  className="btn btn-secondary"
                  disabled={filteredFlashcards.length === 0}
                >
                  📝 Quản lý từ vựng
                </button>
                <button
                  onClick={() => handleStartStudy('set')}
                  className="btn btn-success"
                  disabled={filteredFlashcards.filter(c => c.status !== 'learned').length === 0}
                  title="Học set đã chọn"
                >
                  📚 Học Set này
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn btn-secondary"
                >
                  ⚙️ Cài đặt
                </button>
              </div>
            </div>
          )}


          <div className="backup-controls">
            <p>📦 Sao lưu dữ liệu định kỳ để tránh mất mát.</p>
            <div className="backup-controls__actions">
              <button onClick={handleExportBackup} className="btn btn-secondary">
                ⬇️ Xuất JSON
              </button>
              <button onClick={handleImportBackup} className="btn btn-secondary">
                ⬆️ Nhập JSON
              </button>
            </div>
            <input
              type="file"
              accept="application/json"
              ref={backupInputRef}
              onChange={handleBackupFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {state.flashcards.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>
                Thống kê theo cấp độ
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div key={level} className="level-stat-card" style={{ 
                    border: level === '0' ? '2px solid #4ec9b0' : '1px solid var(--border-color)'
                  }}>
                    <div className="level-stat-number">
                      {count}
                    </div>
                    <div className="level-stat-label">
                      Cấp {level}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default FlashcardManager;
