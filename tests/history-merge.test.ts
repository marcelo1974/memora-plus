import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeHistory } from '../src/services/historyMerge';
import type { AnswerHistoryRecord } from '../src/types';
const a: AnswerHistoryRecord = { id: 'a', questionId: 'q', timestamp: '2026-10-03T12:00:00Z', mode: 'TREINO', isCorrect: true, timeSpentMs: 100 };
test('union is idempotent and does not mutate sources', () => {
  const b = { ...a, id: 'b', isCorrect: false };
  const local = [a]; const cloud = [a, b];
  const merged = mergeHistory(local, cloud);
  assert.equal(merged.length, 2);
  assert.deepEqual(mergeHistory(merged, cloud), merged);
  assert.equal(local.length, 1);
});
test('transport metadata and undefined answers do not duplicate responses', () => {
  assert.equal(mergeHistory([a], [{ ...a, userId: 'owner' } as AnswerHistoryRecord]).length, 1);
  assert.equal(mergeHistory([], [a])[0].selectedOption, undefined);
});
test('conflicting IDs stop instead of overwriting', () => {
  assert.throws(() => mergeHistory([a], [{ ...a, isCorrect: false }]), /conflitante/);
});
test('invalid cloud records stop before persistence', () => {
  assert.throws(() => mergeHistory([a], [{ ...a, timestamp: 'invalid' }]));
});
