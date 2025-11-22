import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flashcard, StudySession as StudySessionRecord } from '../types';
import { getCardsForReview, getStudyStats } from '../utils/spacedRepetition';
import ImportForm from './ImportForm';
import StudySession, { StudySessionResult } from './StudySession';
import SessionSummary from './SessionSummary';
import FlashcardList from './FlashcardList';
import StudyModeSelector from './StudyModeSelector';
import { useAppContext } from '../context/AppContext';
import {
  calculateCardUrgency
} from '../utils/overdue';
import SettingsForm from './SettingsForm';
import HomePage from './HomePage';
import FoldersManagementPage from './FoldersManagementPage';

type Page = 'home' | 'folders' | 'set-detail' | 'flashcard-list';

const FlashcardManager: React.FC = () => {
  const { state, dispatch, storageError, clearStorageError } = useAppContext();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showSummary, setShowSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingStudyParams, setPendingStudyParams] = useState<{ mode: 'set' | 'quick'; setId?: string } | null>(null);
  const [learningMode, setLearningMode] = useState<'study' | 'test'>('test');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    incorrectCards: Flashcard[];
    durationMinutes: number;
    startedAt: Date;
    finishedAt: Date;
    overdueReviewed: number;
    learningMode?: 'study' | 'test';
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

  const handleStartStudy = (mode: 'set' | 'quick', setId?: string, favoritesOnly: boolean = false) => {
    let cardsToStudy: Flashcard[] = [];

    if (mode === 'set') {
      const targetSetId = setId || state.selectedSetId;
      if (!targetSetId) {
        setUiMessage({
          type: 'warning',
          text: 'Vui lòng chọn một set để học!'
        });
        return;
      }
      // Get all active cards in the set
      cardsToStudy = state.flashcards.filter(card => card.setId === targetSetId && card.status !== 'learned');
      
      // Filter favorites if requested
      if (favoritesOnly) {
        cardsToStudy = cardsToStudy.filter(card => card.isFavorite);
      }
    } else {
      // Quick Study mode - get all active cards
      cardsToStudy = getQuickStudyCards;
      
      // Filter favorites if requested
      if (favoritesOnly) {
        cardsToStudy = cardsToStudy.filter(card => card.isFavorite);
      }
    }

    if (cardsToStudy.length === 0) {
      setUiMessage({
        type: 'info',
        text: favoritesOnly
          ? 'Không có từ favorite nào. Hãy đánh dấu ⭐ một số từ!'
          : mode === 'set'
          ? 'Không có thẻ nào trong set này. Hãy thêm thẻ mới!'
          : 'Không có thẻ nào để học. Hãy thêm thẻ mới vào các set!'
      });
      return;
    }

    // Show mode selector before starting
    setPendingStudyParams({ mode, setId });
    setShowModeSelector(true);
    setUiMessage(null);
  };

  const handleModeSelected = (selectedMode: 'study' | 'test') => {
    if (!pendingStudyParams) return;

    const { mode, setId } = pendingStudyParams;
    let cardsToStudy: Flashcard[] = [];

    if (mode === 'set') {
      const targetSetId = setId || state.selectedSetId;
      cardsToStudy = state.flashcards.filter(card => card.setId === targetSetId && card.status !== 'learned');
    } else {
      cardsToStudy = getQuickStudyCards;
    }

    if (showFavoritesOnly) {
      cardsToStudy = cardsToStudy.filter(card => card.isFavorite);
    }

    setLearningMode(selectedMode);
    setCurrentSessionCards(cardsToStudy);
    setShowModeSelector(false);
    setPendingStudyParams(null);
    
    dispatch({ 
      type: 'START_STUDY', 
      payload: { 
        mode, 
        setId: mode === 'set' ? (setId || state.selectedSetId || undefined) : undefined 
      } 
    });
  };

  const handleCreateNewSet = (setName: string) => {
    console.log('handleCreateNewSet called with name:', setName);

    const generateId = () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const newSet = {
      id: generateId(),
      name: setName,
      folderId: '', // No folder
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0
    };

    console.log('Creating new set:', newSet);
    dispatch({ type: 'CREATE_VOCABULARY_SET', payload: newSet });
    dispatch({ type: 'SET_SELECTED_SET', payload: newSet.id });
    setCurrentPage('set-detail');
  };

  const handleCreateNewFolder = (folderName: string) => {
    console.log('handleCreateNewFolder called with name:', folderName);

    const generateId = () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const newFolder = {
      id: generateId(),
      name: folderName,
      createdAt: new Date(),
      updatedAt: new Date(),
      setCount: 0
    };

    console.log('Creating new folder:', newFolder);
    dispatch({ type: 'CREATE_FOLDER', payload: newFolder });
    setCurrentPage('folders');
  };

  const handleSelectSet = (setId: string) => {
    dispatch({ type: 'SET_SELECTED_SET', payload: setId });
    setCurrentPage('set-detail');
  };

  const handleStudyComplete = ({ updatedCards, incorrectCards, stats, durationMs, startedAt, finishedAt, overdueReviewed, learningMode: completedMode }: StudySessionResult) => {
    // Only update flashcards if in TEST mode
    if (completedMode === 'test') {
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
    } else {
      // Study mode - just exit without updating
      dispatch({ type: 'EXIT_STUDY' });
    }

    const durationMinutes = Math.round((durationMs / 60000) * 100) / 100;

    setSessionResults({
      correctCount: stats.correct,
      incorrectCount: stats.incorrect,
      incorrectCards,
      durationMinutes,
      startedAt,
      finishedAt,
      overdueReviewed,
      learningMode: completedMode
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
    // Only save session if it was in TEST mode
    if (sessionResults?.learningMode === 'test') {
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
    }

    setShowSummary(false);
    setSessionResults(null);
    setCurrentSessionCards(null);
  };

  const handleStudyAgain = () => {
    if (!currentSessionCards || currentSessionCards.length === 0) return;
    
    // Study again in STUDY mode (no progress tracking) with accuracy shown
    setShowSummary(false);
    setSessionResults(null);
    setLearningMode('study');
    
    dispatch({ type: 'START_STUDY' });
  };

  const handleUpdateCard = (updatedCard: Flashcard) => {
    dispatch({ type: 'UPDATE_FLASHCARD', payload: updatedCard });
    // Word count will be updated automatically in reducer
  };

  const handleToggleFavorite = (card: Flashcard) => {
    console.log('Toggle favorite for:', card.term, 'Current:', card.isFavorite);
    const updatedCard = {
      ...card,
      isFavorite: !card.isFavorite
    };
    dispatch({ type: 'UPDATE_FLASHCARD', payload: updatedCard });
    
    // Also update in current session if card is being studied
    if (currentSessionCards) {
      setCurrentSessionCards(currentSessionCards.map(c => 
        c.id === card.id ? updatedCard : c
      ));
    }
  };

  const handleDeleteCard = (cardId: string) => {
    dispatch({ type: 'DELETE_FLASHCARD', payload: cardId });
    // Word count will be updated automatically in reducer
  };

  const handleDeleteAllCards = () => {
    dispatch({ type: 'DELETE_ALL_FLASHCARDS' });
  };

  const reviveFlashcardFromBackup = (card: any): Flashcard => {
    const generateId = () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

  const reviveSessionFromBackup = (session: any): StudySessionRecord => {
    const generateId = () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    return {
      id: typeof session?.id === 'string' ? session.id : generateId(),
      date: session?.date ? new Date(session.date) : new Date(),
      cardsStudied: typeof session?.cardsStudied === 'number' ? session.cardsStudied : 0,
      correctAnswers: typeof session?.correctAnswers === 'number' ? session.correctAnswers : 0,
      totalTime: typeof session?.totalTime === 'number' ? session.totalTime : 0,
      overdueReviews: typeof session?.overdueReviews === 'number' ? session.overdueReviews : 0
    };
  };

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

  // Render mode selector
  if (showModeSelector && pendingStudyParams) {
    const setName = pendingStudyParams.mode === 'set' && state.selectedSetId
      ? state.vocabularySets.find(s => s.id === state.selectedSetId)?.name || 'Unknown Set'
      : 'Quick Study';
      
    return (
      <>
        {storageBanner}
        {notificationBanner}
        <StudyModeSelector
          setName={setName}
          onSelectMode={handleModeSelected}
          onCancel={() => {
            setShowModeSelector(false);
            setPendingStudyParams(null);
          }}
        />
      </>
    );
  }

  // Render settings modal overlay if open
  if (showSettings) {
    return (
      <>
        {storageBanner}
        {notificationBanner}
        <SettingsForm onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // Render session summary
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
          onStudyAgain={currentSessionCards && currentSessionCards.length > 0 ? handleStudyAgain : undefined}
          learningMode={sessionResults.learningMode}
        />
      </div>
    );
  }

  // Render study session
  if (state.isStudying) {
    const cardsToStudy = sessionResults && sessionResults.incorrectCards.length > 0
      ? sessionResults.incorrectCards
      : currentSessionCards ?? [];

    return (
      <>
        {storageBanner}
        {notificationBanner}
        <StudySession
          cards={cardsToStudy}
          onComplete={handleStudyComplete}
          onExit={handleExitStudy}
          onToggleFavorite={handleToggleFavorite}
          learningMode={learningMode}
        />
      </>
    );
  }

  // Render import form (legacy support)
  if (state.showImportForm) {
    return (
      <div className="container">
        <div className="header">
          <h1>📚 Học Từ Vựng</h1>
          <p>Hệ thống học từ vựng với spaced repetition</p>
        </div>
        {storageBanner}
        {notificationBanner}
        <ImportForm
          onImport={handleImport}
          onClose={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: false })}
        />
      </div>
    );
  }

  // Render flashcard list for a specific set
  if (currentPage === 'flashcard-list' && state.selectedSetId) {
    return (
      <div className="container" style={{ position: 'relative' }}>
        {/* Back Button - Top Left */}
        <button
          onClick={() => setCurrentPage('set-detail')}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#2a2a2a',
            border: '1px solid #3a3a3a',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3a3a3a';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2a2a2a';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
          }}
          title="Back"
        >
          ×
        </button>

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
      </div>
    );
  }

  // Render set detail page
  if (currentPage === 'set-detail' && state.selectedSetId) {
    const selectedSet = state.vocabularySets.find(s => s.id === state.selectedSetId);
    const activeCards = filteredFlashcards.filter(c => c.status !== 'learned');
    const favoriteCards = activeCards.filter(c => c.isFavorite);
    
    return (
      <div className="container" style={{ position: 'relative' }}>
        {/* Back Button - Top Left */}
        <button
          onClick={() => {
            dispatch({ type: 'SET_SELECTED_SET', payload: null });
            setCurrentPage('home');
          }}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#2a2a2a',
            border: '1px solid #3a3a3a',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3a3a3a';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2a2a2a';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
          }}
          title="Back to Home"
        >
          ×
        </button>

        <div className="header">
          <h1>📚 {selectedSet?.name || 'Vocabulary Set'}</h1>
          <p>Manage and study your vocabulary</p>
        </div>
        {storageBanner}
        {notificationBanner}

        <div className="card">
          <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>
            {activeCards.length} Active Cards
            {favoriteCards.length > 0 && (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                ({favoriteCards.length} ⭐ favorites)
              </span>
            )}
          </h2>

          {/* Favorites Filter Toggle */}
          {favoriteCards.length > 0 && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`btn ${showFavoritesOnly ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem', padding: '8px 16px' }}
              >
                {showFavoritesOnly ? '⭐ Favorites Only' : '📚 All Cards'}
              </button>
            </div>
          )}

          <div className="controls" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => handleStartStudy('set', undefined, showFavoritesOnly)}
              className="btn btn-success"
              disabled={showFavoritesOnly ? favoriteCards.length === 0 : activeCards.length === 0}
            >
              🚀 {showFavoritesOnly ? 'Study Favorites' : 'Start Learning'}
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: true })}
              className="btn btn-primary"
            >
              ➕ Add Words
            </button>
            <button
              onClick={() => setCurrentPage('flashcard-list')}
              className="btn btn-secondary"
              disabled={filteredFlashcards.length === 0}
            >
              📝 Manage Cards
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Render folders management page
  if (currentPage === 'folders') {
    return (
      <>
        {storageBanner}
        {notificationBanner}
        <FoldersManagementPage
          onBack={() => setCurrentPage('home')}
          onSelectSet={handleSelectSet}
          onShowImportForm={() => dispatch({ type: 'SET_SHOW_IMPORT_FORM', payload: true })}
        />
      </>
    );
  }

  // Render home page
  return (
    <>
      {storageBanner}
      {notificationBanner}
      <HomePage
        onStartQuickStudy={() => handleStartStudy('quick')}
        onCreateNewSet={handleCreateNewSet}
        onCreateNewFolder={handleCreateNewFolder}
        onViewFolders={() => setCurrentPage('folders')}
        onOpenSettings={() => setShowSettings(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
      <input
        type="file"
        accept="application/json"
        ref={backupInputRef}
        onChange={handleBackupFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default FlashcardManager;
