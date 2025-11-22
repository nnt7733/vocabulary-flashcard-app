import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState, Flashcard, StudySession, Folder, VocabularySet } from '../types';
import {
  loadAppData,
  migrateFromLocalStorage,
  saveFlashcards,
  saveStudySessions,
  saveFolders,
  saveVocabularySets
} from '../utils/storage';
import { applyOverduePenalty, recordOverdueSnapshot } from '../utils/overdue';

type ImportedCard = { term: string; definition: string };

type AppAction =
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<Pick<AppState, 'flashcards' | 'studySessions' | 'folders' | 'vocabularySets'>> }
  | { type: 'IMPORT_FLASHCARDS'; payload: { cards: ImportedCard[]; setId: string } }
  | { type: 'SET_SHOW_IMPORT_FORM'; payload: boolean }
  | { type: 'START_STUDY'; payload?: { mode: 'set' | 'quick'; setId?: string } }
  | { type: 'EXIT_STUDY' }
  | { type: 'COMPLETE_STUDY'; payload: { updatedCards: Flashcard[] } }
  | { type: 'UPDATE_FLASHCARD'; payload: Flashcard }
  | { type: 'DELETE_FLASHCARD'; payload: string }
  | { type: 'DELETE_ALL_FLASHCARDS' }
  | { type: 'ADD_STUDY_SESSION'; payload: StudySession }
  | { type: 'CREATE_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: Folder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'CREATE_VOCABULARY_SET'; payload: VocabularySet }
  | { type: 'UPDATE_VOCABULARY_SET'; payload: VocabularySet }
  | { type: 'DELETE_VOCABULARY_SET'; payload: string }
  | { type: 'SET_SELECTED_FOLDER'; payload: string | null }
  | { type: 'SET_SELECTED_SET'; payload: string | null };

const initialState: AppState = {
  flashcards: [],
  studySessions: [],
  folders: [],
  vocabularySets: [],
  currentCardIndex: 0,
  isFlipped: false,
  isStudying: false,
  showImportForm: false,
  selectedFolderId: null,
  selectedSetId: null,
  studyMode: null,
  learningMode: null,
  showFavoritesOnly: false
};

function createFlashcardFromImport(card: ImportedCard, setId: string): Flashcard {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
    term: card.term,
    definition: card.definition,
    createdAt: new Date(),
    repetitions: [],
    currentLevel: 0,
    nextReviewDate: new Date(),
    isNew: true,
    status: 'active',
    setId: setId
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
    status: raw.status === 'learned' ? 'learned' : 'active',
    setId: raw.setId || '' // Ensure setId exists, will be assigned during migration if needed
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
        studySessions: action.payload.studySessions ?? state.studySessions,
        folders: action.payload.folders ?? state.folders,
        vocabularySets: action.payload.vocabularySets ?? state.vocabularySets
      };
    }
    case 'IMPORT_FLASHCARDS': {
      const newFlashcards = action.payload.cards.map(card => createFlashcardFromImport(card, action.payload.setId));
      const updatedSet = state.vocabularySets.find(s => s.id === action.payload.setId);
      return {
        ...state,
        flashcards: [...state.flashcards, ...newFlashcards],
        vocabularySets: updatedSet
          ? state.vocabularySets.map(s => s.id === action.payload.setId ? { ...s, wordCount: s.wordCount + newFlashcards.length, updatedAt: new Date() } : s)
          : state.vocabularySets,
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
        isStudying: true,
        studyMode: action.payload?.mode ?? null,
        selectedSetId: action.payload?.setId ?? null
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
    case 'UPDATE_FLASHCARD': {
      const updatedFlashcards = state.flashcards.map(card =>
        card.id === action.payload.id ? action.payload : card
      );
      // Update word count for the set
      const updatedSet = state.vocabularySets.find(s => s.id === action.payload.setId);
      const updatedSets = updatedSet
        ? state.vocabularySets.map(s => {
            if (s.id === action.payload.setId) {
              const wordCount = updatedFlashcards.filter(c => c.setId === s.id && c.status !== 'learned').length;
              return { ...s, wordCount, updatedAt: new Date() };
            }
            return s;
          })
        : state.vocabularySets;
      return {
        ...state,
        flashcards: updatedFlashcards,
        vocabularySets: updatedSets
      };
    }
    case 'DELETE_FLASHCARD': {
      const deletedCard = state.flashcards.find(c => c.id === action.payload);
      const updatedFlashcards = state.flashcards.filter(card => card.id !== action.payload);
      // Update word count for the set
      const updatedSets = deletedCard
        ? state.vocabularySets.map(s => {
            if (s.id === deletedCard.setId) {
              const wordCount = updatedFlashcards.filter(c => c.setId === s.id && c.status !== 'learned').length;
              return { ...s, wordCount, updatedAt: new Date() };
            }
            return s;
          })
        : state.vocabularySets;
      return {
        ...state,
        flashcards: updatedFlashcards,
        vocabularySets: updatedSets
      };
    }
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
    case 'CREATE_FOLDER':
      return {
        ...state,
        folders: [...state.folders, action.payload]
      };
    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f => f.id === action.payload.id ? action.payload : f)
      };
    case 'DELETE_FOLDER': {
      const folderId = action.payload;
      const setsToDelete = state.vocabularySets.filter(s => s.folderId === folderId).map(s => s.id);
      return {
        ...state,
        folders: state.folders.filter(f => f.id !== folderId),
        vocabularySets: state.vocabularySets.filter(s => s.folderId !== folderId),
        flashcards: state.flashcards.filter(c => !setsToDelete.includes(c.setId))
      };
    }
    case 'CREATE_VOCABULARY_SET': {
      const folder = state.folders.find(f => f.id === action.payload.folderId);
      return {
        ...state,
        vocabularySets: [...state.vocabularySets, action.payload],
        folders: folder
          ? state.folders.map(f => f.id === action.payload.folderId ? { ...f, setCount: f.setCount + 1, updatedAt: new Date() } : f)
          : state.folders
      };
    }
    case 'UPDATE_VOCABULARY_SET':
      return {
        ...state,
        vocabularySets: state.vocabularySets.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_VOCABULARY_SET': {
      const setId = action.payload;
      const set = state.vocabularySets.find(s => s.id === setId);
      const folder = set ? state.folders.find(f => f.id === set.folderId) : null;
      return {
        ...state,
        vocabularySets: state.vocabularySets.filter(s => s.id !== setId),
        flashcards: state.flashcards.filter(c => c.setId !== setId),
        folders: folder
          ? state.folders.map(f => f.id === folder.id ? { ...f, setCount: Math.max(0, f.setCount - 1), updatedAt: new Date() } : f)
          : state.folders
      };
    }
    case 'SET_SELECTED_FOLDER':
      return {
        ...state,
        selectedFolderId: action.payload,
        selectedSetId: null
      };
    case 'SET_SELECTED_SET':
      return {
        ...state,
        selectedSetId: action.payload
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

    const hydrateWithData = (flashcards?: Flashcard[], studySessions?: StudySession[], folders?: Folder[], vocabularySets?: VocabularySet[]) => {
      if (isCancelled) {
        return;
      }

      dispatch({
        type: 'HYDRATE_FROM_STORAGE',
        payload: {
          flashcards,
          studySessions,
          folders,
          vocabularySets
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

    const reviveFolder = (raw: any): Folder => ({
      id: typeof raw?.id === 'string' ? raw.id : generateId(),
      name: typeof raw?.name === 'string' ? raw.name : 'New Folder',
      createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : new Date(),
      setCount: typeof raw?.setCount === 'number' ? raw.setCount : 0
    });

    const reviveVocabularySet = (raw: any): VocabularySet => ({
      id: typeof raw?.id === 'string' ? raw.id : generateId(),
      name: typeof raw?.name === 'string' ? raw.name : 'New Set',
      folderId: typeof raw?.folderId === 'string' ? raw.folderId : '',
      createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : new Date(),
      wordCount: typeof raw?.wordCount === 'number' ? raw.wordCount : 0
    });

    const generateId = () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const hydrate = async () => {
      if (supportsIndexedDB) {
        try {
          const { flashcards, studySessions, folders, vocabularySets } = await loadAppData<any, any, any, any>();

          const revivedFlashcards = flashcards
            ? flashcards.map((card: any) => reviveFlashcard(card))
            : undefined;
          const penalizedFlashcards = revivedFlashcards
            ? applyOverduePenalty(revivedFlashcards)
            : undefined;
          const revivedStudySessions = studySessions
            ? studySessions.map((session: any) => reviveStudySession(session))
            : undefined;
          const revivedFolders = folders
            ? folders.map((folder: any) => reviveFolder(folder))
            : undefined;
          const revivedSets = vocabularySets
            ? vocabularySets.map((set: any) => reviveVocabularySet(set))
            : undefined;

          hydrateWithData(penalizedFlashcards, revivedStudySessions, revivedFolders, revivedSets);
          
          if ((flashcards?.length ?? 0) > 0 || (studySessions?.length ?? 0) > 0 || (folders?.length ?? 0) > 0 || (vocabularySets?.length ?? 0) > 0) {
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

    const timeoutId = window.setTimeout(() => {
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
    }, 1200);

    try {
      recordOverdueSnapshot(state.flashcards);
    } catch (error) {
      console.warn('[FlashcardApp] Không thể cập nhật lịch sử trễ hạn:', error);
    }

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.flashcards, supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
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
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.studySessions, supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (supportsIndexedDB) {
        void saveFolders(state.folders)
          .then(() => {
            // Success
          })
          .catch(error => {
            console.warn('[FlashcardApp] Không thể lưu folders vào IndexedDB:', error);
          });
      } else {
        window.localStorage.setItem('folders', JSON.stringify(state.folders));
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.folders, supportsIndexedDB]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (supportsIndexedDB) {
        void saveVocabularySets(state.vocabularySets)
          .then(() => {
            // Success
          })
          .catch(error => {
            console.warn('[FlashcardApp] Không thể lưu vocabulary sets vào IndexedDB:', error);
          });
      } else {
        window.localStorage.setItem('vocabularySets', JSON.stringify(state.vocabularySets));
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.vocabularySets, supportsIndexedDB]);

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
