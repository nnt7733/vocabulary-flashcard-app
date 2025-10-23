const DB_NAME = 'vocabulary-flashcard-app';
const DB_VERSION = 1;
const FLASHCARD_STORE = 'flashcards';
const SESSION_STORE = 'studySessions';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FLASHCARD_STORE)) {
        const flashcardStore = db.createObjectStore(FLASHCARD_STORE, { keyPath: 'id' });
        flashcardStore.createIndex('nextReviewDate', 'nextReviewDate');
        flashcardStore.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
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

    const clearRequest = store.clear();

    clearRequest.onerror = () => reject(clearRequest.error ?? new Error('Failed to clear IndexedDB store.'));

    clearRequest.onsuccess = () => {
      values.forEach(value => {
        store.put(value);
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to write to IndexedDB.'));
  });
}

export async function loadAppData<TFlashcard, TSession>(): Promise<{
  flashcards: TFlashcard[];
  studySessions: TSession[];
}> {
  const db = await openDatabase();

  const [flashcards, studySessions] = await Promise.all([
    getAllFromStore<TFlashcard>(db, FLASHCARD_STORE),
    getAllFromStore<TSession>(db, SESSION_STORE)
  ]);

  db.close();

  return { flashcards, studySessions };
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
