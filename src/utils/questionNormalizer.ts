import { OptionLetter, Question } from "../types";

/**
 * Normalizador retrocompatível de questões: garante que questões antigas recebam discipline = subject
 * Extraído para módulo compartilhado para evitar referências circulares entre storageService e storageMigrator.
 */
export function normalizeQuestion(raw: any): Question {
  const subject = typeof raw.subject === "string" && raw.subject.trim() !== "" ? raw.subject : "Geral";
  const discipline =
    typeof raw.discipline === "string" && raw.discipline.trim() !== ""
      ? raw.discipline
      : subject;

  const validLetters = ["A", "B", "C", "D", "E"];
  const correctOption = validLetters.includes(raw.correctOption)
    ? (raw.correctOption as OptionLetter)
    : "A";

  const optionE =
    typeof raw.optionE === "string" && raw.optionE.trim() !== ""
      ? raw.optionE.trim()
      : undefined;

  const origin =
    typeof raw.origin === "string" && raw.origin.trim() !== ""
      ? raw.origin.trim()
      : undefined;

  const observation =
    typeof raw.observation === "string" && raw.observation.trim() !== ""
      ? raw.observation.trim()
      : undefined;

  return {
    ...raw,
    discipline,
    subject,
    topic: typeof raw.topic === "string" && raw.topic.trim() !== "" ? raw.topic : "Geral",
    difficulty: raw.difficulty || "Médio",
    estimatedTime: raw.estimatedTime || 60,
    tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : [subject],
    isFavorite: Boolean(raw.isFavorite),
    memoryState: raw.memoryState || "NOVA",
    repetitionCount: typeof raw.repetitionCount === "number" ? raw.repetitionCount : 0,
    easeFactor: typeof raw.easeFactor === "number" ? raw.easeFactor : 2.5,
    intervalDays: typeof raw.intervalDays === "number" ? raw.intervalDays : 1,
    nextReviewDate: raw.nextReviewDate || new Date().toISOString(),
    lastReviewDate: raw.lastReviewDate || undefined,
    correctCount: typeof raw.correctCount === "number" ? raw.correctCount : 0,
    errorCount: typeof raw.errorCount === "number" ? raw.errorCount : 0,
    averageTimeSpentMs: typeof raw.averageTimeSpentMs === "number" ? raw.averageTimeSpentMs : 0,
    optionE,
    correctOption,
    origin,
    observation,
  };
}
