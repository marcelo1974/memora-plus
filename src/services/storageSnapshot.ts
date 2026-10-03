import type { AnswerHistoryRecord, DailyGoalProgress, Question, StudySession, UserSettings } from '../types';

export interface StorageSnapshot {
  questions: Question[];
  history: AnswerHistoryRecord[];
  sessions: StudySession[];
  settings: UserSettings | null;
  dailyGoal: DailyGoalProgress | null;
}

// Object property order is irrelevant; absent and undefined fields are equivalent.
export function sameStoredValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameStoredValue(v, b[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => sameStoredValue(left[key], right[key]));
}

export function snapshotDifferences(source: StorageSnapshot, target: StorageSnapshot): string[] {
  const errors: string[] = [];
  for (const name of ['questions', 'history', 'sessions'] as const) {
    const expected = source[name];
    const actual = target[name];
    if (expected.length !== actual.length) errors.push(`Contagem divergente em ${name}: origem=${expected.length}, destino=${actual.length}.`);
    const byId = new Map(actual.map((item) => [item.id, item]));
    for (const item of expected) {
      if (!sameStoredValue(item, byId.get(item.id))) errors.push(`Conteúdo divergente em ${name}, ID ${item.id}.`);
    }
  }
  for (const name of ['settings', 'dailyGoal'] as const) {
    if (!sameStoredValue(source[name], target[name])) errors.push(`Conteúdo divergente em ${name}.`);
  }
  return errors;
}

export function assertStoredRecords(value: unknown, name: string): asserts value is { id: string }[] {
  if (!Array.isArray(value)) throw new Error(`${name}: esperado um array.`);
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) throw new Error(`${name}: registro com ID inválido.`);
    if (ids.has(item.id)) throw new Error(`${name}: ID duplicado ${item.id}.`);
    ids.add(item.id);
  }
}

export function assertOptionalObject(value: unknown, name: string): void {
  if (value !== null && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error(`${name}: esperado um objeto ou null.`);
}

export function recordProblems(name: string, item: any): string[] {
  const errors: string[] = [];
  const requiredText = (key: string) => {
    if (typeof item?.[key] !== 'string' || !item[key].trim()) errors.push(`${name}: ${key} inválido.`);
  };
  const nonnegative = (key: string, optional = false) => {
    if (optional && item?.[key] === undefined) return;
    if (typeof item?.[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0) errors.push(`${name}: ${key} inválido.`);
  };
  const letters = ['A', 'B', 'C', 'D', 'E'];
  if (['questions', 'history', 'sessions'].includes(name)) requiredText('id');
  if (name === 'questions') {
    for (const key of ['question', 'optionA', 'optionB', 'optionC', 'optionD']) requiredText(key);
    if (!letters.includes(item?.correctOption)) errors.push('questions: gabarito inválido.');
    if (item?.correctOption === 'E') requiredText('optionE');
    if (item?.memoryState !== undefined && !['NOVA', 'APRENDENDO', 'REVISAR', 'DOMINADA'].includes(item.memoryState)) errors.push('questions: estado de memória inválido.');
    for (const key of ['repetitionCount', 'easeFactor', 'intervalDays', 'correctCount', 'errorCount', 'averageTimeSpentMs']) nonnegative(key, true);
    if (item?.nextReviewDate !== undefined && !Number.isFinite(Date.parse(item.nextReviewDate))) errors.push('questions: data de revisão inválida.');
  }
  if (name === 'history') {
    requiredText('questionId'); requiredText('timestamp'); nonnegative('timeSpentMs');
    if (!Number.isFinite(Date.parse(item?.timestamp))) errors.push('history: timestamp inválido.');
    if (typeof item?.isCorrect !== 'boolean') errors.push('history: isCorrect inválido.');
    if (item?.selectedOption !== undefined && !letters.includes(item.selectedOption)) errors.push('history: resposta inválida.');
  }
  if (name === 'history' || name === 'sessions') {
    if (!['TREINO', 'DESAFIO', 'SIMULADO', 'REVISAO'].includes(item?.mode)) errors.push(`${name}: modo inválido.`);
  }
  if (name === 'sessions') {
    nonnegative('startTime');
    if (!Array.isArray(item?.questionIds) || item.questionIds.some((id: unknown) => typeof id !== 'string')) errors.push('sessions: questionIds inválido.');
  }
  if (name === 'settings') {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return ['settings: objeto inválido.'];
    if (item.theme !== undefined && !['light', 'dark', 'system'].includes(item.theme)) errors.push('settings: tema inválido.');
    for (const key of ['dailyGoalTarget', 'dailyTimeGoalMinutes', 'weeklyDaysGoalTarget', 'autoAdvanceDelayMs']) nonnegative(key, true);
  }
  if (name === 'goals') {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return ['goals: objeto inválido.'];
    if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) errors.push('goals: data inválida.');
    for (const key of ['target', 'completed', 'timeTargetMinutes', 'timeCompletedMinutes', 'timeCompletedMs', 'weeklyTargetDays', 'weeklyCompletedDays', 'currentStreak', 'bestStreak']) nonnegative(key, true);
  }
  return errors;
}

export function assertSnapshotData(snapshot: StorageSnapshot): void {
  const errors: string[] = [];
  for (const name of ['questions', 'history', 'sessions'] as const) {
    assertStoredRecords(snapshot[name], name);
    for (const record of snapshot[name]) errors.push(...recordProblems(name, record));
  }
  for (const [name, value] of [['settings', snapshot.settings], ['goals', snapshot.dailyGoal]] as const) {
    assertOptionalObject(value, name);
    if (value !== null) errors.push(...recordProblems(name, value));
  }
  if (errors.length) throw { type: 'INVALID_DATA', message: errors.slice(0, 20).join('; ') };
}
