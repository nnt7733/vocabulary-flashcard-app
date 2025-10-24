import { Flashcard } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DUE_SOON_THRESHOLD_DAYS = 3;
export const LONG_OVERDUE_DAYS = 7;

export interface CardUrgency {
  isOverdue: boolean;
  isLongOverdue: boolean;
  overdueDays: number;
  isDueSoon: boolean;
  daysUntilDue: number;
  urgencyScore: number;
}

export interface OverdueSnapshot {
  date: string;
  count: number;
}

export function calculateCardUrgency(card: Flashcard, now: Date = new Date()): CardUrgency {
  const nextReview = card.nextReviewDate instanceof Date
    ? card.nextReviewDate
    : new Date(card.nextReviewDate);

  const diffMs = nextReview.getTime() - now.getTime();
  const isOverdue = diffMs <= 0;
  const overdueDays = isOverdue ? Math.floor(Math.abs(diffMs) / MS_PER_DAY) : 0;
  const daysUntilDue = isOverdue ? 0 : Math.ceil(diffMs / MS_PER_DAY);
  const isLongOverdue = isOverdue && overdueDays >= LONG_OVERDUE_DAYS;
  const isDueSoon = !isOverdue && daysUntilDue <= DUE_SOON_THRESHOLD_DAYS;

  let urgencyScore = 0;
  if (isLongOverdue) {
    urgencyScore = 3;
  } else if (isOverdue) {
    urgencyScore = 2;
  } else if (isDueSoon) {
    urgencyScore = 1;
  }

  return {
    isOverdue,
    isLongOverdue,
    overdueDays,
    isDueSoon,
    daysUntilDue,
    urgencyScore
  };
}

export function sortCardsByUrgency(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  return [...cards].sort((a, b) => {
    const urgencyA = calculateCardUrgency(a, now);
    const urgencyB = calculateCardUrgency(b, now);

    if (urgencyA.urgencyScore !== urgencyB.urgencyScore) {
      return urgencyB.urgencyScore - urgencyA.urgencyScore;
    }

    const nextReviewA = a.nextReviewDate instanceof Date ? a.nextReviewDate : new Date(a.nextReviewDate);
    const nextReviewB = b.nextReviewDate instanceof Date ? b.nextReviewDate : new Date(b.nextReviewDate);

    if (nextReviewA.getTime() !== nextReviewB.getTime()) {
      return nextReviewA.getTime() - nextReviewB.getTime();
    }

    if (a.isNew !== b.isNew) {
      return a.isNew ? 1 : -1;
    }

    return a.term.localeCompare(b.term);
  });
}

export function getOverdueCards(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  return cards.filter(card => {
    if (card.status === 'learned') {
      return false;
    }
    const urgency = calculateCardUrgency(card, now);
    return urgency.isOverdue;
  });
}

export function getLongOverdueCards(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  return getOverdueCards(cards, now).filter(card => calculateCardUrgency(card, now).isLongOverdue);
}

export function getDueSoonCards(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  return cards.filter(card => {
    if (card.status === 'learned') {
      return false;
    }
    const urgency = calculateCardUrgency(card, now);
    return urgency.isDueSoon;
  });
}

export function countOverdueCards(cards: Flashcard[], now: Date = new Date()): number {
  return getOverdueCards(cards, now).length;
}

export function loadOverdueHistory(): OverdueSnapshot[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem('overdueHistory');
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(entry => typeof entry?.date === 'string' && typeof entry?.count === 'number');
  } catch (error) {
    console.warn('[FlashcardApp] Không thể đọc lịch sử trễ hạn:', error);
    return [];
  }
}

export function recordOverdueSnapshot(cards: Flashcard[], now: Date = new Date()): void {
  if (typeof window === 'undefined') {
    return;
  }

  const history = loadOverdueHistory();
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const count = countOverdueCards(cards, now);
  const existingIndex = history.findIndex(entry => entry.date === todayKey);

  if (existingIndex >= 0) {
    if (history[existingIndex].count === count) {
      return;
    }
    history[existingIndex] = { date: todayKey, count };
  } else {
    history.push({ date: todayKey, count });
  }

  const trimmed = history
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30);

  try {
    window.localStorage.setItem('overdueHistory', JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[FlashcardApp] Không thể lưu lịch sử trễ hạn:', error);
  }
}

export function applyOverduePenalty(cards: Flashcard[], now: Date = new Date()): Flashcard[] {
  const nowTime = now.getTime();

  return cards.map(card => {
    const nextReviewDate = card.nextReviewDate instanceof Date
      ? card.nextReviewDate
      : new Date(card.nextReviewDate);
    const nextReviewTime = nextReviewDate.getTime();

    if (Number.isNaN(nextReviewTime) || nextReviewTime > nowTime) {
      return card;
    }

    const overdueDays = Math.floor((nowTime - nextReviewTime) / MS_PER_DAY);

    if (overdueDays < 3) {
      return card;
    }

    const penaltyLevels = Math.floor(overdueDays / 3);
    if (penaltyLevels <= 0) {
      return card;
    }

    const downgradedLevel = Math.max(0, card.currentLevel - penaltyLevels);

    if (downgradedLevel === card.currentLevel) {
      return card;
    }

    return {
      ...card,
      currentLevel: downgradedLevel,
      status: 'active'
    };
  });
}
