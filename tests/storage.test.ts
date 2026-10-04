import { normalizeQuestion } from '../src/utils/questionNormalizer';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { IndexedDbStorage, indexedDbStorage } from '../src/services/indexedDbStorage';
import { StorageMigrator } from '../src/services/storageMigrator';
import { StorageServiceManager, STORAGE_KEYS } from '../src/services/storageService';
import { StorageHealthService } from '../src/services/storageHealthService';
import { INITIAL_QUESTIONS } from '../src/data/initialQuestions';
import { sameStoredValue, snapshotDifferences, StorageSnapshot } from '../src/services/storageSnapshot';
import type { AppStorageMetadata, AnswerHistoryRecord, StudySession, UserSettings } from '../src/types';

let legacy: Map<string, string>;
let mutations: number;
const settings: UserSettings = { theme: 'dark', dailyGoalTarget: 30, dailyTimeGoalMinutes: 30, weeklyDaysGoalTarget: 5, fontSize: 'normal', highContrast: false, soundEffects: true, autoAdvanceDelayMs: 1200, timerEnabled: true };
const metadata: AppStorageMetadata = { schemaVersion: 1, migrationVersion: 1, migrationStatus: 'COMPLETED', validationStatus: 'PASSED', lastIntegrityCheck: '2026-10-01T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };
const historyRecord = (id = 'blank'): AnswerHistoryRecord => ({ id, questionId: INITIAL_QUESTIONS[0].id, selectedOption: undefined, isCorrect: false, timeSpentMs: 3500, timestamp: '2026-10-01T00:00:00.000Z', mode: 'SIMULADO' });
const sessionRecord = (id = 's1'): StudySession => ({ id, mode: 'SIMULADO', title: 'Teste', startTime: 1790812800000, questionIds: [INITIAL_QUESTIONS[0].id], currentIndex: 0, answers: {}, results: {}, timeSpentPerQuestion: {}, completed: true, scorePercent: 0, totalCorrect: 0, totalWrong: 1 });
const snapshot = (): StorageSnapshot => ({ questions: INITIAL_QUESTIONS.map(normalizeQuestion), history: [historyRecord()], sessions: [sessionRecord()], settings: { ...settings }, dailyGoal: { date: '2026-10-01', target: 30, completed: 1, timeTargetMinutes: 30, timeCompletedMinutes: 1, timeCompletedMs: 3500, weeklyTargetDays: 5, weeklyCompletedDays: 1, currentStreak: 1, bestStreak: 1, weekDaysProgress: [] } });

beforeEach(() => {
  indexedDbStorage.close();
  legacy = new Map(); mutations = 0;
  const factory = new IDBFactory();
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, writable: true, value: factory });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { indexedDB: factory, localStorage: { getItem: (key: string) => legacy.get(key) ?? null, setItem: (key: string, value: string) => { mutations++; legacy.set(key, value); }, removeItem: (key: string) => { mutations++; legacy.delete(key); } } } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
});

function seedLegacy(data = snapshot()) {
  for (const [key, value] of [[STORAGE_KEYS.QUESTIONS, data.questions], [STORAGE_KEYS.HISTORY, data.history], [STORAGE_KEYS.SESSIONS, data.sessions], [STORAGE_KEYS.SETTINGS, data.settings], [STORAGE_KEYS.DAILY_GOAL, data.dailyGoal]] as const) {
    if (value !== null) legacy.set(key, JSON.stringify(value));
  }
}

test('migração conserva todos os campos, branco undefined, legado e idempotência', async () => {
  seedLegacy();
  const original = [...legacy];
  const migrator = new StorageMigrator(indexedDbStorage);
  assert.equal((await migrator.executeMigration()).status, 'COMPLETED');
  const actual = await indexedDbStorage.readSnapshot();
  assert.deepEqual(snapshotDifferences(snapshot(), actual), []);
  assert.equal(actual.history[0].selectedOption, undefined);
  assert.equal((await migrator.executeMigration()).status, 'SKIPPED');
  assert.deepEqual([...legacy], original);
  assert.equal(mutations, 0);
});

test('JSON inválido em qualquer chave aborta sem marcador de sucesso nem cópias parciais', async () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    seedLegacy(); legacy.set(key, '{invalid');
    const result = await new StorageMigrator(indexedDbStorage).executeMigration();
    assert.equal(result.success, false, key);
    assert.equal(await indexedDbStorage.getAppMetadata(), null);
    assert.equal((await indexedDbStorage.getAllQuestions()).length, 0);
    assert.equal(legacy.get(key), '{invalid');
  }
  assert.equal(mutations, 0);
});

test('legado com array inválido ou IDs duplicados não é aceito', async () => {
  legacy.set(STORAGE_KEYS.QUESTIONS, '{}');
  assert.equal((await new StorageMigrator(indexedDbStorage).executeMigration()).success, false);
  const data = snapshot(); data.questions.push({ ...data.questions[0] }); seedLegacy(data);
  assert.equal((await new StorageMigrator(indexedDbStorage).executeMigration()).success, false);
  assert.equal(await indexedDbStorage.getAppMetadata(), null);
});

test('acesso bloqueado ao localStorage falha sem certificar migração vazia', async () => {
  Object.defineProperty((globalThis as any).window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  assert.equal((await new StorageMigrator(indexedDbStorage).executeMigration()).success, false);
  assert.equal(await indexedDbStorage.getAppMetadata(), null);
});

test('validação completa detecta settings/metas ausentes e campos depois da antiga amostra', async () => {
  const data = snapshot();
  data.questions = Array.from({ length: 60 }, (_, index) => ({ ...data.questions[0], id: 'q' + index }));
  await indexedDbStorage.commitSnapshot(data, true);
  const source = structuredClone(data);
  source.questions[59].intervalDays += 5;
  source.questions[59].question += ' diferente';
  source.settings = null; source.dailyGoal = null;
  const validation = await new StorageMigrator(indexedDbStorage).validateMigration(source);
  assert.equal(validation.passed, false);
  assert.ok(validation.errors.some((message) => message.includes('q59')));
  assert.ok(validation.errors.some((message) => message.includes('settings')));
  assert.ok(validation.errors.some((message) => message.includes('dailyGoal')));
});

test('migração completa faz rollback em conflito, sem sobrescrever registros anteriores', async () => {
  const data = snapshot(); seedLegacy(data);
  const existing = { ...data.questions[0], question: 'Versão nova no destino' };
  await indexedDbStorage.putQuestion(existing);
  const result = await new StorageMigrator(indexedDbStorage).executeMigration();
  assert.equal(result.success, false);
  assert.deepEqual(await indexedDbStorage.getAllQuestions(), [existing]);
  assert.deepEqual(await indexedDbStorage.getAllHistory(), []);
  assert.deepEqual(await indexedDbStorage.getAllSessions(), []);
  assert.equal(await indexedDbStorage.getAppMetadata(), null);
});

test('exceção síncrona no segundo put cancela o primeiro registro do lote', async () => {
  await assert.rejects(indexedDbStorage.batchPut('questions', [{ id: 'valid' }, { noId: true }]));
  assert.deepEqual(await indexedDbStorage.getAllQuestions(), []);
  await assert.rejects(indexedDbStorage.batchPut('questions', [{ id: 'valid' }, { id: 'uncloneable', fn: () => {} }]));
  assert.deepEqual(await indexedDbStorage.getAllQuestions(), []);
});

test('quota simulada aborta toda a migração e é classificada corretamente', async () => {
  seedLegacy();
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
    if (this.name === 'history') throw new DOMException('Limite de quota', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    const result = await new StorageMigrator(indexedDbStorage).executeMigration();
    assert.equal(result.success, false);
    assert.equal(new StorageHealthService().classifyStorageError(result.error).type, 'QUOTA_EXCEEDED');
    assert.deepEqual(await indexedDbStorage.getAllQuestions(), []);
    assert.equal(await indexedDbStorage.getAppMetadata(), null);
  } finally { IDBObjectStore.prototype.put = put; }
});

test('bootstrap concorrente compartilha execução e getters não gravam no legado', async () => {
  seedLegacy(); const original = [...legacy];
  const service = new StorageServiceManager();
  service.getQuestions(); service.getDailyGoalProgress(); service.checkStorageHealth();
  const first = service.initializeStorage(); const second = service.initializeStorage();
  assert.equal(first, second);
  assert.equal((await first).success, true);
  assert.equal(service.isIndexedDbAuthoritative(), true);
  assert.deepEqual([...legacy], original); assert.equal(mutations, 0);
  service.saveSettings({ theme: 'light' }); await service.flushWrites();
  assert.equal((await indexedDbStorage.getSettings())?.theme, 'light');
  assert.deepEqual([...legacy], original);
});

test('bootstrap malsucedido emite alerta e impede escrita no legado', async () => {
  legacy.set(STORAGE_KEYS.HISTORY, 'invalid');
  const service = new StorageServiceManager(); const errors: any[] = [];
  service.onStorageError((error) => errors.push(error));
  assert.equal((await service.initializeStorage()).success, false);
  assert.equal(errors[0].type, 'CORRUPTED_DATA');
  assert.throws(() => service.saveSettings({ theme: 'dark' }));
  assert.equal(mutations, 0);
});

test('restore substitui integralmente stores, restaura metas e persiste após reabertura', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const data = snapshot(); data.questions = [data.questions[0]];
  assert.equal((await service.importFullBackupJSON(JSON.stringify(data))).success, true);
  indexedDbStorage.close();
  const reopened = new StorageServiceManager(); assert.equal((await reopened.initializeStorage()).success, true);
  const stored = await indexedDbStorage.readSnapshot();
  assert.deepEqual(snapshotDifferences(data, stored), []);
  assert.equal(reopened.getQuestions().length, 1);
  assert.equal(mutations, 0);
});

test('restore vazio não faz questões reaparecerem no bootstrap', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const data = snapshot(); data.questions = []; data.history = []; data.sessions = [];
  assert.equal((await service.importFullBackupJSON(JSON.stringify(data))).success, true);
  indexedDbStorage.close();
  const reopened = new StorageServiceManager(); await reopened.initializeStorage();
  assert.deepEqual(reopened.getQuestions(), []);
});

test('reset realmente remove questões antigas e volta às configurações padrão', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  service.addQuestion({ ...INITIAL_QUESTIONS[0], id: 'old', question: 'Extra' });
  service.saveSettings({ theme: 'dark' }); await service.flushWrites();
  await service.resetToDefaults();
  indexedDbStorage.close();
  const reopened = new StorageServiceManager(); await reopened.initializeStorage();
  assert.equal(reopened.getQuestions().length, INITIAL_QUESTIONS.length);
  assert.ok(!reopened.getQuestions().some((q) => q.id === 'old'));
  assert.deepEqual(reopened.getAnswerHistory(), []);
  assert.equal(reopened.getSettings().theme, 'light');
});

test('falha no restore preserva banco e cache e não anuncia sucesso', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const previous = await indexedDbStorage.readSnapshot(); const errors: any[] = [];
  service.onStorageError((error) => errors.push(error));
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
    if (this.name === 'sessions') throw new DOMException('Quota', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    assert.equal((await service.importFullBackupJSON(JSON.stringify(snapshot()))).success, false);
    assert.ok(errors.length);
    assert.equal(sameStoredValue(previous, await indexedDbStorage.readSnapshot()), true);
    assert.deepEqual(service.getQuestions().sort((a, b) => a.id.localeCompare(b.id)), previous.questions.sort((a, b) => a.id.localeCompare(b.id)));
  } finally { IDBObjectStore.prototype.put = put; }
});

test('escritas de questões são ordenadas, exclusão e favorito sobrevivem à reabertura', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const first = service.getQuestions()[0]; const second = service.getQuestions()[1];
  service.updateQuestion(first.id, { question: 'Alterada' });
  service.toggleFavorite(first.id);
  service.deleteQuestion(second.id);
  await service.flushWrites(); indexedDbStorage.close();
  const reopened = new StorageServiceManager(); await reopened.initializeStorage();
  const saved = reopened.getQuestions().find((q) => q.id === first.id)!;
  assert.equal(saved.question, 'Alterada'); assert.equal(saved.isFavorite, !first.isFavorite);
  assert.ok(!reopened.getQuestions().some((q) => q.id === second.id));
});

test('backup não trunca histórico e sessões só no cache', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const data = snapshot();
  data.history = Array.from({ length: 5001 }, (_, i) => historyRecord('h' + i));
  data.sessions = Array.from({ length: 501 }, (_, i) => sessionRecord('s' + i));
  assert.equal((await service.importFullBackupJSON(JSON.stringify(data))).success, true);
  service.saveAnswerHistoryBatch([historyRecord('last')]); service.saveStudySession(sessionRecord('last'));
  await service.flushWrites();
  const backup = JSON.parse(service.exportFullBackupJSON());
  assert.equal(backup.history.length, 5002); assert.equal(backup.sessions.length, 502);
  assert.equal((await indexedDbStorage.getAllHistory()).length, 5002);
});

test('saúde inicia NOT_RUN e thresholds usam percentual sem arredondar', async () => {
  const health = new StorageHealthService();
  assert.equal((await health.getStorageHealth()).integrityStatus, 'NOT_RUN');
  for (const [usage, expected] of [[69.999, 'HEALTHY'], [70, 'WARNING'], [84.999, 'WARNING'], [85, 'CRITICAL']] as const) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { storage: { estimate: async () => ({ usage, quota: 100 }), persisted: async () => false } } });
    assert.equal((await health.getStorageHealth()).status, expected);
  }
});

test('integridade detecta órfãos com zero questões, mantendo todos os registros', async () => {
  const data = snapshot(); data.questions = [];
  await indexedDbStorage.commitSnapshot(data, true, metadata);
  const before = await indexedDbStorage.readSnapshot();
  const report = await new StorageHealthService().checkIntegrity();
  assert.equal(report.overall, 'WARNING'); assert.equal(report.orphanHistoryCount, 1);
  assert.equal(sameStoredValue(before, await indexedDbStorage.readSnapshot()), true);
  assert.deepEqual(await indexedDbStorage.getAppMetadata(), metadata);
});

test('integridade avalia além de 50 questões, schema zero e ausência de settings/goals', async () => {
  const data = snapshot();
  data.questions = Array.from({ length: 60 }, (_, index) => ({ ...data.questions[0], id: 'q' + index }));
  data.questions[59].correctOption = 'Z' as any;
  data.settings = null; data.dailyGoal = null;
  await indexedDbStorage.commitSnapshot(data, true, { ...metadata, schemaVersion: 0 });
  const report = await new StorageHealthService().checkIntegrity();
  assert.equal(report.overall, 'FAIL'); assert.equal(report.schemaVersion, 0);
  assert.ok(report.anomalies.some((message) => message.includes('gabarito')));
  assert.ok(report.anomalies.some((message) => message.includes('settings')));
});

test('adaptador pode tentar novamente após IndexedDB indisponível', async () => {
  const adapter = new IndexedDbStorage(); const factory = (globalThis as any).indexedDB;
  (globalThis as any).indexedDB = undefined; (globalThis as any).window.indexedDB = undefined;
  await assert.rejects(adapter.getDb());
  (globalThis as any).indexedDB = factory; (globalThis as any).window.indexedDB = factory;
  assert.ok(await adapter.getDb()); adapter.close();
});


test('migrações em duas instâncias não sobrescrevem um marcador concluído', async () => {
  seedLegacy();
  const first = new StorageMigrator(indexedDbStorage);
  const second = new StorageMigrator(indexedDbStorage);
  const results = await Promise.all([first.executeMigration(), second.executeMigration()]);
  assert.ok(results.every((result) => result.success));
  assert.equal((await indexedDbStorage.getAppMetadata())?.migrationStatus, 'COMPLETED');
  assert.equal((await indexedDbStorage.getAllQuestions()).length, INITIAL_QUESTIONS.length);
  assert.equal(mutations, 0);
});

test('restore rejeita gabarito inválido antes da normalização', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const data = snapshot(); data.questions[0].correctOption = 'Z' as any;
  const before = await indexedDbStorage.readSnapshot();
  assert.equal((await service.importFullBackupJSON(JSON.stringify(data))).success, false);
  assert.deepEqual(await indexedDbStorage.readSnapshot(), before);
});

test('restore bloqueia alterações concorrentes até concluir o commit', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const restore = service.importFullBackupJSON(JSON.stringify(snapshot()));
  assert.throws(() => service.saveSettings({ theme: 'light' }));
  assert.equal((await restore).success, true);
  service.saveSettings({ theme: 'light' }); await service.flushWrites();
  assert.equal((await indexedDbStorage.getSettings())?.theme, 'light');
});

test('erro assíncrono fica visível e flush não confirma persistência inexistente', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  const errors: any[] = []; service.onStorageError((error) => errors.push(error));
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
    if (this.name === 'settings') throw new DOMException('Quota', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    service.saveSettings({ customBrandName: 'Ainda não salvo' });
    await assert.rejects(service.flushWrites());
    assert.ok(errors.some((error) => error.type === 'QUOTA_EXCEEDED'));
    assert.equal((await indexedDbStorage.getSettings())?.customBrandName, undefined);
    assert.equal(service.getSettings().customBrandName, 'Ainda não salvo');
    assert.equal(JSON.parse(service.exportFullBackupJSON()).settings.customBrandName, 'Ainda não salvo');
  } finally { IDBObjectStore.prototype.put = put; }
});


test('nova escrita invalida um diagnóstico de integridade anterior', async () => {
  const service = new StorageServiceManager(); await service.initializeStorage();
  assert.equal((await service.runIntegrityCheck()).overall, 'PASS');
  service.saveSettings({ theme: 'dark' });
  assert.equal((await service.getStorageHealthDetails()).integrityStatus, 'NOT_RUN');
  await service.flushWrites();
});

test('bootstrap rejeita dados corrompidos mesmo com marcador COMPLETED', async () => {
  const data = snapshot(); data.questions[0].correctOption = 'Z' as any;
  await indexedDbStorage.commitSnapshot(data, true, metadata);
  const service = new StorageServiceManager();
  assert.equal((await service.initializeStorage()).success, false);
  assert.equal(service.isIndexedDbAuthoritative(), false);
  assert.equal((await indexedDbStorage.getAllQuestions()).find((q) => q.id === data.questions[0].id)?.correctOption, 'Z');
});

test('cloud union commits history once and preserves local questions and sessions', async () => {
  await indexedDbStorage.commitSnapshot(snapshot(), true, metadata);
  const service = new StorageServiceManager(); await service.initializeStorage();
  await service.mergeCloudStudyData([], [historyRecord('remote')]);
  await service.mergeCloudStudyData([], [historyRecord('remote')]);
  assert.equal(service.getAnswerHistory().length, 2);
  assert.equal((await indexedDbStorage.getAllHistory()).length, 2);
  assert.equal(service.getQuestions().length, snapshot().questions.length);
  assert.equal(service.getStudySessions().length, 1);
});
