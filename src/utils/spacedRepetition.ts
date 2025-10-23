import { Flashcard, SPACED_REPETITION_SCHEDULE } from '../types';

export function calculateNextReviewDate(level: number, lastReviewDate: Date): Date {
  const schedule = SPACED_REPETITION_SCHEDULE[level];
  if (!schedule) {
    // If level is beyond our schedule, use the last interval
    const lastSchedule = SPACED_REPETITION_SCHEDULE[SPACED_REPETITION_SCHEDULE.length - 1];
    const daysToAdd = lastSchedule.days;
    const nextDate = new Date(lastReviewDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  const nextDate = new Date(lastReviewDate);
  nextDate.setDate(nextDate.getDate() + schedule.days);
  return nextDate;
}

export function updateCardAfterReview(
  card: Flashcard,
  correct: boolean,
  responseTime: number
): Flashcard {
  const now = new Date();

  // Add new repetition record
  const newRepetition = {
    level: card.currentLevel,
    date: now,
    correct,
    responseTime
  };

  const updatedRepetitions = [...card.repetitions, newRepetition];

  let newLevel = card.currentLevel;
  let nextReviewDate = card.nextReviewDate;
  let status: Flashcard['status'] = card.status ?? 'active';

  if (correct) {
    // Move to next level if correct
    newLevel = Math.min(card.currentLevel + 1, SPACED_REPETITION_SCHEDULE.length - 1);
    nextReviewDate = calculateNextReviewDate(newLevel, now);

    status = newLevel === SPACED_REPETITION_SCHEDULE.length - 1 ? 'learned' : 'active';
  } else {
    // Check if last attempt was also incorrect (2 consecutive failures)
    const lastTwoReps = updatedRepetitions.slice(-2);
    const twoConsecutiveFailures = lastTwoReps.length >= 2 &&
      !lastTwoReps[0].correct &&
      !lastTwoReps[1].correct;

    if (twoConsecutiveFailures) {
      // Reset to level 0 after 2 consecutive failures
      newLevel = 0;
    } else {
      // Decrease by 1 level (but not below 0)
      newLevel = Math.max(card.currentLevel - 1, 0);
    }

    nextReviewDate = calculateNextReviewDate(newLevel, now);
    status = 'active';
  }

  return {
    ...card,
    repetitions: updatedRepetitions,
    currentLevel: newLevel,
    nextReviewDate,
    isNew: false,
    status
  };
}

export function getCardsForReview(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  return cards.filter(card => {
    // Include new cards (level 0) or cards that are due for review
    if (card.status === 'learned') {
      return false;
    }
    return card.currentLevel === 0 || card.nextReviewDate <= now;
  });
}

export function getCardsByLevel(cards: Flashcard[]): { [level: number]: Flashcard[] } {
  const cardsByLevel: { [level: number]: Flashcard[] } = {};

  for (let i = 0; i <= 5; i++) {
    cardsByLevel[i] = cards.filter(card => card.status !== 'learned' && card.currentLevel === i);
  }

  return cardsByLevel;
}

export function getStudyStats(cards: Flashcard[]): {
  total: number;
  new: number;
  due: number;
  byLevel: { [level: number]: number };
} {
  const activeCards = cards.filter(card => card.status !== 'learned');
  const newCards = activeCards.filter(card => card.isNew).length;
  const dueCards = getCardsForReview(activeCards).length;
  const byLevel = getCardsByLevel(activeCards);

  return {
    total: activeCards.length,
    new: newCards,
    due: dueCards,
    byLevel: Object.fromEntries(
      Object.entries(byLevel).map(([level, cards]) => [level, cards.length])
    )
  };
}
