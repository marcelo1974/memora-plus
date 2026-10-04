import type { AnswerHistoryRecord } from '../types';
import { assertSnapshotData, sameStoredValue } from './storageSnapshot';

export function mergeHistory(local: AnswerHistoryRecord[], cloud: AnswerHistoryRecord[]): AnswerHistoryRecord[] {
  // Strip transport fields (userId) before comparison and local persistence.
  const clean = (item: AnswerHistoryRecord): AnswerHistoryRecord => ({
    id: item.id, questionId: item.questionId, selectedOption: item.selectedOption,
    isCorrect: item.isCorrect, timeSpentMs: item.timeSpentMs, timestamp: item.timestamp,
    mode: item.mode, reviewRating: item.reviewRating,
  });
  const byId = new Map<string, AnswerHistoryRecord>();
  for (const source of [local, cloud]) {
    assertSnapshotData({ questions: [], history: source, sessions: [], settings: null, dailyGoal: null });
    for (const raw of source) {
      const item = clean(raw);
      const previous = byId.get(item.id);
      if (previous && !sameStoredValue(previous, item)) throw new Error(`Histórico conflitante: ${item.id}. Nenhuma resposta foi sobrescrita.`);
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));
}
