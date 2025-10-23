/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />

export interface LoadDataMessage {
  flashcards: string | null;
  studySessions: string | null;
}

export interface LoadDataResponse {
  flashcards?: any[];
  studySessions?: any[];
  errors?: string[];
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', event => {
  const { flashcards, studySessions } = event.data as LoadDataMessage;
  const errors: string[] = [];

  const parseJson = (value: string | null, label: string) => {
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Không thể đọc dữ liệu ${label}: ${message}`);
      return undefined;
    }
  };

  const parsedFlashcards = parseJson(flashcards, 'flashcards');
  const parsedSessions = parseJson(studySessions, 'studySessions');

  const response: LoadDataResponse = {
    flashcards: parsedFlashcards,
    studySessions: parsedSessions,
    errors: errors.length ? errors : undefined
  };

  ctx.postMessage(response);
});
