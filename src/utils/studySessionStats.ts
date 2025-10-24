import { StudySession } from '../types';

interface TimeframeSummary {
  sessions: number;
  cardsStudied: number;
  correctAnswers: number;
  minutes: number;
  accuracy: number;
  overdueReviews: number;
}

export interface AggregatedStudySummary {
  day: TimeframeSummary;
  month: TimeframeSummary;
  year: TimeframeSummary;
}

function createSummary(sessions: StudySession[], start: Date, end: Date): TimeframeSummary {
  const filtered = sessions.filter(session => {
    const date = session.date instanceof Date ? session.date : new Date(session.date);
    return date >= start && date < end;
  });

  const totals = filtered.reduce(
    (acc, session) => {
      acc.sessions += 1;
      acc.cardsStudied += session.cardsStudied;
      acc.correctAnswers += session.correctAnswers;
      acc.minutes += session.totalTime || 0;
      acc.overdueReviews += session.overdueReviews ?? 0;
      return acc;
    },
    { sessions: 0, cardsStudied: 0, correctAnswers: 0, minutes: 0, overdueReviews: 0 }
  );

  const accuracy = totals.cardsStudied > 0
    ? Math.round((totals.correctAnswers / totals.cardsStudied) * 100)
    : 0;

  return {
    ...totals,
    accuracy
  };
}

export function aggregateStudySessions(sessions: StudySession[], referenceDate: Date = new Date()): AggregatedStudySummary {
  const startOfDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const startOfYear = new Date(referenceDate.getFullYear(), 0, 1);
  const endOfYear = new Date(referenceDate.getFullYear() + 1, 0, 1);

  return {
    day: createSummary(sessions, startOfDay, endOfDay),
    month: createSummary(sessions, startOfMonth, endOfMonth),
    year: createSummary(sessions, startOfYear, endOfYear)
  };
}
