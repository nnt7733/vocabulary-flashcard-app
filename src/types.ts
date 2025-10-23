export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  createdAt: Date;
  repetitions: Repetition[];
  currentLevel: number; // 0-5 (6 levels total)
  nextReviewDate: Date;
  isNew: boolean;
  status?: 'active' | 'learned';
}

export interface Repetition {
  level: number;
  date: Date;
  correct: boolean;
  responseTime: number; // in milliseconds
}

export interface StudySession {
  id: string;
  date: Date;
  cardsStudied: number;
  correctAnswers: number;
  totalTime: number; // in minutes
}

export interface AppState {
  flashcards: Flashcard[];
  studySessions: StudySession[];
  currentCardIndex: number;
  isFlipped: boolean;
  isStudying: boolean;
  showImportForm: boolean;
}

// Spaced repetition schedule based on the image
export const SPACED_REPETITION_SCHEDULE = [
  { level: 0, days: 0 },    // Day 0 (initial learning)
  { level: 1, days: 1 },    // Day 1 (1 day after)
  { level: 2, days: 3 },    // Day 3 (2 days after level 1)
  { level: 3, days: 7 },    // Day 7 (4 days after level 2)
  { level: 4, days: 14 },   // Day 14 (7 days after level 3)
  { level: 5, days: 28 },   // Day 28 (14 days after level 4)
];

export type DelimiterType = 'tab' | 'comma' | 'custom';
export type CardSeparatorType = 'newline' | 'semicolon' | 'custom';
