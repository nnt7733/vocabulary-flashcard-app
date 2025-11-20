const DB_NAME = 'vocabulary-flashcard-app';
const DB_VERSION = 2;
const FLASHCARD_STORE = 'flashcards';
const SESSION_STORE = 'studySessions';
const FOLDER_STORE = 'folders';
const SET_STORE = 'vocabularySets';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion || 0;

      if (!db.objectStoreNames.contains(FLASHCARD_STORE)) {
        const flashcardStore = db.createObjectStore(FLASHCARD_STORE, { keyPath: 'id' });
        flashcardStore.createIndex('nextReviewDate', 'nextReviewDate');
        flashcardStore.createIndex('status', 'status');
        flashcardStore.createIndex('setId', 'setId');
      }

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(FOLDER_STORE)) {
          db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SET_STORE)) {
          const setStore = db.createObjectStore(SET_STORE, { keyPath: 'id' });
          setStore.createIndex('folderId', 'folderId');
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error('Failed to read from IndexedDB.'));
  });
}

function clearAndBulkPut<T extends { id: string }>(db: IDBDatabase, storeName: string, values: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    let hasRejected = false;

    const rejectOnce = (error: DOMException | null | undefined, fallback: string) => {
      if (hasRejected) {
        return;
      }
      hasRejected = true;
      try {
        transaction.abort();
      } catch {
        // Ignore abort errors; transaction may already be closing.
      }
      reject(error ?? new Error(fallback));
    };

    transaction.oncomplete = () => {
      if (!hasRejected) {
        resolve();
      }
    };

    transaction.onerror = () => {
      rejectOnce(transaction.error, 'Failed to write to IndexedDB.');
    };

    const clearRequest = store.clear();

    clearRequest.onerror = () => {
      rejectOnce(clearRequest.error, 'Failed to clear IndexedDB store.');
    };

    clearRequest.onsuccess = () => {
      values.forEach(value => {
        const putRequest = store.put(value);
        putRequest.onerror = () => {
          rejectOnce(putRequest.error, 'Failed to write record to IndexedDB.');
        };
      });
    };
  });
}

export async function loadAppData<TFlashcard, TSession, TFolder = any, TSet = any>(): Promise<{
  flashcards: TFlashcard[];
  studySessions: TSession[];
  folders: TFolder[];
  vocabularySets: TSet[];
}> {
  const db = await openDatabase();

  const [flashcards, studySessions, folders, vocabularySets] = await Promise.all([
    getAllFromStore<TFlashcard>(db, FLASHCARD_STORE),
    getAllFromStore<TSession>(db, SESSION_STORE),
    getAllFromStore<TFolder>(db, FOLDER_STORE).catch(() => [] as TFolder[]),
    getAllFromStore<TSet>(db, SET_STORE).catch(() => [] as TSet[])
  ]);

  db.close();

  return { flashcards, studySessions, folders, vocabularySets };
}

export async function saveFlashcards<TFlashcard extends { id: string }>(flashcards: TFlashcard[]): Promise<void> {
  const db = await openDatabase();
  await clearAndBulkPut(db, FLASHCARD_STORE, flashcards);
  db.close();
}

export async function saveStudySessions<TSession extends { id: string }>(studySessions: TSession[]): Promise<void> {
  const db = await openDatabase();
  await clearAndBulkPut(db, SESSION_STORE, studySessions);
  db.close();
}

export async function saveFolders<TFolder extends { id: string }>(folders: TFolder[]): Promise<void> {
  const db = await openDatabase();
  await clearAndBulkPut(db, FOLDER_STORE, folders);
  db.close();
}

export async function saveVocabularySets<TSet extends { id: string }>(sets: TSet[]): Promise<void> {
  const db = await openDatabase();
  await clearAndBulkPut(db, SET_STORE, sets);
  db.close();
}

export async function migrateFromLocalStorage<TFlashcard extends { id: string }, TSession extends { id: string }>(
  flashcards: TFlashcard[],
  studySessions: TSession[]
): Promise<void> {
  const db = await openDatabase();
  await Promise.all([
    clearAndBulkPut(db, FLASHCARD_STORE, flashcards),
    clearAndBulkPut(db, SESSION_STORE, studySessions)
  ]);
  db.close();
}
