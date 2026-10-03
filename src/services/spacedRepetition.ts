import { MemoryState, Question, SpacedReviewRating } from "../types";

export interface ReviewCalculationResult {
  memoryState: MemoryState;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string; // ISO string
  lastReviewDate: string;
}

export function calculateSpacedReview(
  question: Question,
  rating: SpacedReviewRating
): ReviewCalculationResult {
  let { repetitionCount = 0, easeFactor = 2.5, intervalDays = 1 } = question;
  const now = Date.now();
  let nextIntervalDays = 1;
  let newRepetitions = repetitionCount;
  let newEase = easeFactor;
  let nextState: MemoryState = "APRENDENDO";

  switch (rating) {
    case "NAO_LEMBRO": {
      newRepetitions = 0;
      newEase = Math.max(1.3, Number((easeFactor - 0.22).toFixed(2)));
      nextIntervalDays = 1;
      nextState = "APRENDENDO";
      break;
    }
    case "DIFICIL": {
      newRepetitions += 1;
      newEase = Math.max(1.3, Number((easeFactor - 0.14).toFixed(2)));
      if (newRepetitions <= 1) {
        nextIntervalDays = 1;
      } else if (newRepetitions === 2) {
        nextIntervalDays = 3;
      } else {
        nextIntervalDays = Math.max(2, Math.round(intervalDays * 1.2));
      }
      nextState = newRepetitions >= 4 ? "DOMINADA" : "APRENDENDO";
      break;
    }
    case "BOM": {
      newRepetitions += 1;
      // standard maintenance
      if (newRepetitions === 1) {
        nextIntervalDays = 1;
      } else if (newRepetitions === 2) {
        nextIntervalDays = 4;
      } else {
        nextIntervalDays = Math.round(intervalDays * easeFactor);
      }
      nextState = newRepetitions >= 3 ? "DOMINADA" : "APRENDENDO";
      break;
    }
    case "FACIL": {
      newRepetitions += 1;
      newEase = Math.min(3.2, Number((easeFactor + 0.15).toFixed(2)));
      if (newRepetitions === 1) {
        nextIntervalDays = 3;
      } else if (newRepetitions === 2) {
        nextIntervalDays = 7;
      } else {
        nextIntervalDays = Math.round(intervalDays * easeFactor * 1.35);
      }
      nextState = newRepetitions >= 2 ? "DOMINADA" : "APRENDENDO";
      break;
    }
  }

  const nextReviewTimestamp = now + nextIntervalDays * 86400000;

  return {
    memoryState: nextState,
    repetitionCount: newRepetitions,
    easeFactor: newEase,
    intervalDays: nextIntervalDays,
    nextReviewDate: new Date(nextReviewTimestamp).toISOString(),
    lastReviewDate: new Date(now).toISOString(),
  };
}

/**
 * Returns questions that are overdue for review or marked as needing review
 */
export function getReviewQueue(questions: Question[]): Question[] {
  const now = Date.now();
  return questions
    .filter((q) => {
      if (q.memoryState === "REVISAR") return true;
      if (!q.nextReviewDate) return false;
      const reviewTime = new Date(q.nextReviewDate).getTime();
      return reviewTime <= now;
    })
    .sort((a, b) => {
      const timeA = new Date(a.nextReviewDate).getTime();
      const timeB = new Date(b.nextReviewDate).getTime();
      return timeA - timeB;
    });
}

/**
 * Formats interval in human readable Portuguese
 */
export function formatIntervalPreview(days: number): string {
  if (days <= 1) return "1 dia";
  if (days < 7) return `${days} dias`;
  if (days === 7) return "1 semana";
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  }
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "mês" : "meses"}`;
}
