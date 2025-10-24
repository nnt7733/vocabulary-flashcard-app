import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState, Flashcard, StudySession } from '../types';
import {
  loadAppData,
  migrateFromLocalStorage,
  saveFlashcards,
  saveStudySessions
} from '../utils/storage';
import { applyOverduePenalty, recordOverdueSnapshot } from '../utils/overdue';

type ImportedCard = { term: string; definition: string };

type AppAction =
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<Pick<AppState, 'flashcards' | 'studySessions'>> }
  | { type: 'IMPORT_FLASHCARDS'; payload: { cards: ImportedCard[] } }
  | { type: 'SET_SHOW_IMPORT_FORM'; payload: boolean }
  | { type: 'START_STUDY' }
  | { type: 'EXIT_STUDY' }
  | { type: 'COMPLETE_STUDY'; payload: { updatedCards: Flashcard[] } }
  | { type: 'UPDATE_FLASHCARD'; payload: Flashcard }
  | { type: 'DELETE_FLASHCARD'; payload: string }
  | { type: 'DELETE_ALL_FLASHCARDS' }
  | { type: 'ADD_STUDY_SESSION'; payload: StudySession };

const initialState: AppState = {
  flashcards: [],
  studySessions: [],
  currentCardIndex: 0,
  isFlipped: false,
  isStudying: false,
  showImportForm: false
};

function createFlashcardFromImport(card: ImportedCard): Flashcard {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
    term: card.term,
    definition: card.definition,
    createdAt: new Date(),
    repetitions: [],
    currentLevel: 0,
    nextReviewDate: new Date(),
    isNew: true,
    status: 'active'
  };
}

function reviveFlashcard(raw: any): Flashcard {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    nextReviewDate: new Date(raw.nextReviewDate),
    repetitions: Array.isArray(raw.repetitions)
      ? raw.repetitions.map((rep: any) => ({
          ...rep,
          date: new Date(rep.date)
        }))
      : [],
    status: raw.status === 'learned' ? 'learned' : 'active'
  };
}

function reviveStudySession(raw: any): StudySession {
  return {
    ...raw,
    date: new Date(raw.date),
    overdueReviews: typeof raw.overdueReviews === 'number' ? raw.overdueReviews : 0
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
      return {
        ...state,
        flashcards: action.payload.flashcards ?? state.flashcards,
        studySessions: action.payload.studySessions ?? state.studySessions
      };
    }
    case 'IMPORT_FLASHCARDS': {
      const newFlashcards = action.payload.cards.map(createFlashcardFromImport);
      return {
        ...state,
        flashcards: [...state.flashcards, ...newFlashcards],
        showImportForm: false
      };
    }
    case 'SET_SHOW_IMPORT_FORM':
      return {
        ...state,
        showImportForm: action.payload
      };
    case 'START_STUDY':
      return {
        ...state,
        isStudying: true
      };
    case 'EXIT_STUDY':
      return {
        ...state,
        isStudying: false
      };
    case 'COMPLETE_STUDY':
      return {
        ...state,
        flashcards: action.payload.updatedCards,
        isStudying: false
      };
    case 'UPDATE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.map(card =>
          card.id === action.payload.id ? action.payload : card
        )
      };
    case 'DELETE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.filter(card => card.id !== action.payload)
      };
    case 'DELETE_ALL_FLASHCARDS':
      return {
        ...state,
        flashcards: []
      };
    case 'ADD_STUDY_SESSION':
      return {
        ...state,
        studySessions: [...state.studySessions, action.payload]
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  voices: SpeechSynthesisVoice[];
  storageError: string | null;
  clearStorageError: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supportsIndexedDB] = useState(() => typeof window !== 'undefined' && 'indexedDB' in window);
  const [storageErrors, setStorageErrors] = useState<{ flashcards: string | null; studySessions: string | null }>({
    flashcards: null,
    studySessions: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const hydrateWithData = (flashcards?: Flashcard[], studySessions?: StudySession[]) => {
      if (isCancelled) {
        return;
      }

      dispatch({
        type: 'HYDRATE_FROM_STORAGE',
        payload: {
          flashcards,
          studySessions
        }
      });
    };

    const hydrateFromLocalStorage = () => {
      try {
        const storedFlashcards = window.localStorage.getItem('flashcards');
        const storedStudySessions = window.localStorage.getItem('studySessions');

        if (!storedFlashcards && !storedStudySessions) {
          return null;
        }

        const parsedFlashcards = storedFlashcards ? JSON.parse(storedFlashcards) : undefined;
        const parsedStudySessions = storedStudySessions ? JSON.parse(storedStudySessions) : undefined;

        const revivedFlashcards = parsedFlashcards
          ? parsedFlashcards.map((card: any) => reviveFlashcard(card))
          : undefined;
        const penalizedFlashcards = revivedFlashcards
          ? applyOverduePenalty(revivedFlashcards)
          : undefined;
        const revivedStudySessions = parsedStudySessions
          ? parsedStudySessions.map((session: any) => reviveStudySession(session))
          : undefined;

        hydrateWithData(penalizedFlashcards, revivedStudySessions);

        return {
          flashcards: penalizedFlashcards ?? [],
          studySessions: revivedStudySessions ?? []
        };
      } catch (error) {
        console.warn('[FlashcardApp] Không thể đọc dữ liệu từ localStorage:', error);
        return null;
      }
    };

    const hydrate = async () => {
      if (supportsIndexedDB) {
        try {
          const { flashcards, studySessions } = await loadAppData<any, any>();

          if ((flashcards?.length ?? 0) > 0 || (studySessions?.length ?? 0) > 0) {
            const revivedFlashcards = flashcards
              ? flashcards.map((card: any) => reviveFlashcard(card))
              : undefined;
            const penalizedFlashcards = revivedFlashcards
              ? applyOverduePenalty(revivedFlashcards)
              : undefined;
            const revivedStudySessions = studySessions
              ? studySessions.map((session: any) => reviveStudySession(session))
              : undefined;

            hydrateWithData(penalizedFlashcards, revivedStudySessions);
            return;
          }

          const migrated = hydrateFromLocalStorage();
          if (migrated) {
            try {
              await migrateFromLocalStorage(migrated.flashcards, migrated.studySessions);
            } catch (migrationError) {
              console.warn('[FlashcardApp] Không thể di chuyển dữ liệu sang IndexedDB:', migrationError);
            }
          }
        } catch (error) {
          console.warn('[FlashcardApp] Lỗi khi tải dữ liệu từ IndexedDB:', error);
          const migrated = hydrateFromLocalStorage();
          if (migrated) {
            try {
              await migrateFromLocalStorage(migrated.flashcards, migrated.studySessions);
            } catch (migrationError) {
              console.warn('[FlashcardApp] Không thể di chuyển dữ liệu sau lỗi IndexedDB:', migrationError);
            }
          }
        }
      } else {
        hydrateFromLocalStorage();
      }
    };

    void hydrate();

    return () => {
      isCancelled = true;
    };
  }, [supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (supportsIndexedDB) {
      void saveFlashcards(state.flashcards)
        .then(() => {
          setStorageErrors(prev => (prev.flashcards ? { ...prev, flashcards: null } : prev));
        })
        .catch(error => {
          console.warn('[FlashcardApp] Không thể lưu flashcards vào IndexedDB:', error);
          const message = error instanceof Error ? error.message : String(error);
          setStorageErrors(prev => ({
            ...prev,
            flashcards: `Không thể lưu thẻ vào bộ nhớ: ${message}`
          }));
        });
    } else {
      window.localStorage.setItem('flashcards', JSON.stringify(state.flashcards));
      setStorageErrors(prev => (prev.flashcards ? { ...prev, flashcards: null } : prev));
    }

    try {
      recordOverdueSnapshot(state.flashcards);
    } catch (error) {
      console.warn('[FlashcardApp] Không thể cập nhật lịch sử trễ hạn:', error);
    }
  }, [state.flashcards, supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (supportsIndexedDB) {
      void saveStudySessions(state.studySessions)
        .then(() => {
          setStorageErrors(prev => (prev.studySessions ? { ...prev, studySessions: null } : prev));
        })
        .catch(error => {
          console.warn('[FlashcardApp] Không thể lưu lịch sử học vào IndexedDB:', error);
          const message = error instanceof Error ? error.message : String(error);
          setStorageErrors(prev => ({
            ...prev,
            studySessions: `Không thể lưu lịch sử học: ${message}`
          }));
        });
    } else {
      window.localStorage.setItem('studySessions', JSON.stringify(state.studySessions));
      setStorageErrors(prev => (prev.studySessions ? { ...prev, studySessions: null } : prev));
    }
  }, [state.studySessions, supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    const updateVoices = () => {
      const availableVoices = synth.getVoices();
      if (availableVoices.length) {
        setVoices(availableVoices);
      }
    };

    updateVoices();

    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', updateVoices);
      return () => {
        synth.removeEventListener('voiceschanged', updateVoices);
      };
    }

    const originalHandler = synth.onvoiceschanged;
    synth.onvoiceschanged = updateVoices;
    return () => {
      if (synth.onvoiceschanged === updateVoices) {
        synth.onvoiceschanged = originalHandler ?? null;
      }
    };
  }, []);

  const storageError = useMemo(() => {
    const messages = [];
    if (storageErrors.flashcards) {
      messages.push(storageErrors.flashcards);
    }
    if (storageErrors.studySessions) {
      messages.push(storageErrors.studySessions);
    }
    return messages.length ? messages.join(' ') : null;
  }, [storageErrors]);

  const clearStorageError = useCallback(() => {
    setStorageErrors({ flashcards: null, studySessions: null });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, voices, storageError, clearStorageError }),
    [state, voices, storageError, clearStorageError]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export type { AppAction };
