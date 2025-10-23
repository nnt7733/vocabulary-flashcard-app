import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState, Flashcard, StudySession } from '../types';

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
    isNew: true
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
      : []
  };
}

function reviveStudySession(raw: any): StudySession {
  return {
    ...raw,
    date: new Date(raw.date)
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
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return;
    }

    const worker = new Worker(new URL('../workers/loadDataWorker.ts', import.meta.url), {
      type: 'module'
    });

    worker.postMessage({
      flashcards: localStorage.getItem('flashcards'),
      studySessions: localStorage.getItem('studySessions')
    });

    const handleMessage = (event: MessageEvent) => {
      const { flashcards, studySessions, errors } = event.data as {
        flashcards?: any[];
        studySessions?: any[];
        errors?: string[];
      };

      if (errors && errors.length) {
        console.warn('[FlashcardApp] Lỗi khi tải dữ liệu:', errors);
      }

      dispatch({
        type: 'HYDRATE_FROM_STORAGE',
        payload: {
          flashcards: flashcards ? flashcards.map(reviveFlashcard) : undefined,
          studySessions: studySessions ? studySessions.map(reviveStudySession) : undefined
        }
      });
      worker.terminate();
    };

    worker.addEventListener('message', handleMessage);
    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(state.flashcards));
  }, [state.flashcards]);

  useEffect(() => {
    localStorage.setItem('studySessions', JSON.stringify(state.studySessions));
  }, [state.studySessions]);

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

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, voices }),
    [state, voices]
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
