import type { SM2Card } from '../types';

// SM-2 Algorithm (SuperMemo)
// grade: 0-5 (0-2 = failed, 3-5 = passed)
export function sm2Update(card: SM2Card, grade: number): SM2Card {
  const MIN_EF = 1.3;
  let { interval, repetition, easeFactor } = card;

  if (grade >= 3) {
    // Correct response
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetition += 1;
    easeFactor = Math.max(MIN_EF, easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  } else {
    // Failed — reset
    repetition = 0;
    interval = 1;
  }

  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { ...card, interval, repetition, easeFactor, nextReview, lastReview: Date.now() };
}

export function initSM2Card(topicId: string): SM2Card {
  return { topicId, interval: 1, repetition: 0, easeFactor: 2.5, nextReview: Date.now(), lastReview: 0 };
}

export function isDueForReview(card: SM2Card): boolean {
  return Date.now() >= card.nextReview;
}

export function getDueCards(sm2Cards: Record<string, SM2Card>): SM2Card[] {
  return Object.values(sm2Cards)
    .filter(isDueForReview)
    .sort((a, b) => a.nextReview - b.nextReview);
}

// Convert quiz score (0-1) to SM-2 grade (0-5)
export function scoreToGrade(score: number): number {
  if (score >= 1.0) return 5;
  if (score >= 0.8) return 4;
  if (score >= 0.6) return 3;
  if (score >= 0.4) return 2;
  if (score >= 0.2) return 1;
  return 0;
}
