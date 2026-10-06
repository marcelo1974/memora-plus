import { mergeHistory } from './historyMerge';
import { assertStoredRecords, assertOptionalObject, assertSnapshotData, StorageSnapshot } from './storageSnapshot';
import { INITIAL_QUESTIONS } from "../data/initialQuestions";
import {
  AnswerHistoryRecord,
  DailyGoalProgress,
  OptionLetter,
  Question,
  StudySession,
  UserSettings,
} from "../types";
import { LearningEngine } from "./learningEngine";
import { indexedDbStorage, IndexedDbStorage, INDEXED_DB_CONFIG } from "./indexedDbStorage";
import { StorageMigrator, MigrationExecutionResult } from "./storageMigrator";
import { normalizeQuestion } from "../utils/questionNormalizer";
import { storageHealthService, StorageHealthService } from "./storageHealthService";
import { StorageErrorDetail, StorageHealth, IntegrityCheckReport } from "../types";

export { normalizeQuestion };

export const STORAGE_KEYS = {
  QUESTIONS: "memora_plus_questions_v1",
  HISTORY: "memora_plus_history_v1",
  SESSIONS: "memora_plus_sessions_v1",
  DAILY_GOAL: "memora_plus_daily_goal_v1",
  SETTINGS: "memora_plus_settings_v1",
};

function safeStorageGet(key: string): string | null {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; }
  catch { return null; }
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  dailyGoalTarget: 50,
  dailyTimeGoalMinutes: 30,
  weeklyDaysGoalTarget: 5,
  fontSize: "normal",
  highContrast: false,
  soundEffects: true,
  autoAdvanceDelayMs: 1200,
  timerEnabled: true,
};

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * StorageService — Fronteira de Armazenamento Oficial do MEMORA+ (Fase 4B)
 *
 * Princípios de Transição Arquitetural:
 * 1. O IndexedDB torna-se a fonte AUTORITATIVA persistente após migração validada.
 * 2. O localStorage legado é PRESERVADO como snapshot e rollback de segurança, mas cessa de receber
 *    novas gravações para evitar divergências e dual-write concorrente.
 * 3. O estado do motor em memória (`memoryCache`) é hidratado pelo IndexedDB no bootstrap assíncrono.
 * 4. Toda leitura síncrona dos componentes e do LearningEngine acessa o estado autoritativo em RAM
 *    e toda gravação atualiza a RAM e persiste transacionalmente no IndexedDB de forma não-bloqueante.
 */
export class StorageServiceManager {
  private isInitialized = false;
  private initializationPromise: Promise<MigrationExecutionResult> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private persistenceError: unknown = null;
  private replacingSnapshot = false;

  private assertWritable(): void {
    if (this.replacingSnapshot) {
      const error = { type: 'VALIDATION_FAILED', message: 'Aguarde a conclusão da restauração antes de fazer novas alterações.' };
      this.dispatchStorageError(error);
      throw error;
    }
    if (!this.isAuthoritativeIndexedDb) {
      const error = { type: 'DATABASE_UNAVAILABLE', message: 'O armazenamento ainda não foi inicializado. Nenhum dado legado foi alterado.' };
      this.dispatchStorageError(error);
      throw error;
    }
  }

  private enqueuePersistence(operation: () => Promise<void>, storeName?: string): Promise<void> {
    storageHealthService.invalidateIntegrity();
    const task = this.writeQueue.then(operation);
    this.writeQueue = task.catch((error) => {
      this.persistenceError = error;
      this.dispatchStorageError(error, storeName);
    });
    return task;
  }

  private async replaceSnapshot(snapshot: StorageSnapshot, guard?: () => Promise<void>): Promise<void> {
    this.assertWritable();
    this.replacingSnapshot = true;
    try {
      await this.enqueuePersistence(async () => {
        if (guard) await guard();
        await indexedDbStorage.commitSnapshot(snapshot, true);
        this.hydrate(snapshot);
        this.persistenceError = null;
      });
    } finally { this.replacingSnapshot = false; }
  }

  public async flushWrites(): Promise<void> {
    let pending: Promise<void>;
    do { pending = this.writeQueue; await pending; } while (pending !== this.writeQueue);
    if (this.persistenceError) throw this.persistenceError;
  }

  private hydrate(snapshot: StorageSnapshot): void {
    this.questionsCache = snapshot.questions;
    this.historyCache = [...snapshot.history].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));
    this.sessionsCache = [...snapshot.sessions].sort((a, b) => b.startTime - a.startTime || a.id.localeCompare(b.id));
    this.settingsCache = { ...DEFAULT_SETTINGS, ...snapshot.settings };
    this.dailyGoalCache = snapshot.dailyGoal;
  }

  private isAuthoritativeIndexedDb = false;

  // Cache em memória autoritativo pós-bootstrap
  private questionsCache: Question[] | null = null;
  private historyCache: AnswerHistoryRecord[] | null = null;
  private sessionsCache: StudySession[] | null = null;
  private settingsCache: UserSettings | null = null;
  private dailyGoalCache: DailyGoalProgress | null = null;

  private migrator: StorageMigrator;
  private errorListeners: ((error: StorageErrorDetail) => void)[] = [];

  constructor() {
    this.migrator = new StorageMigrator(indexedDbStorage);
  }

  /**
   * Registra um listener para falhas assíncronas de persistência no IndexedDB
   */
  public onStorageError(listener: (error: StorageErrorDetail) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notifica todos os listeners sobre erros capturados de persistência
   */
  public dispatchStorageError(error: any, storeName?: string): void {
    const detail = storageHealthService.classifyStorageError(error, storeName);
    console.error(`[StorageService Error Event] [${detail.type}]: ${detail.message}`, detail.originalError || "");
    this.errorListeners.forEach((l) => {
      try {
        l(detail);
      } catch (err) {
        console.error("Erro no listener de storage:", err);
      }
    });
  }

  /**
   * Consulta a saúde completa do armazenamento (StorageHealthService)
   */
  public async getStorageHealthDetails(): Promise<StorageHealth> {
    return storageHealthService.getStorageHealth();
  }

  /**
   * Executa a checagem não-destrutiva de integridade do banco (StorageHealthService)
   */
  public async runIntegrityCheck(): Promise<IntegrityCheckReport> {
    await this.flushWrites();
    return storageHealthService.checkIntegrity();
  }

  /**
   * Solicita persistência durável ao navegador sob demanda do usuário
   */
  public async requestPersistentStorage() {
    return storageHealthService.requestPersistentStorage();
  }

  /**
   * Status do motor autoritativo
   */
  public isIndexedDbAuthoritative(): boolean {
    return this.isAuthoritativeIndexedDb;
  }

  /**
   * Diagnostic method for environment verification
   */
  checkStorageHealth(): { available: boolean; type: "localStorage" | "memory" | "indexedDB"; error?: string } {
    try {
      if (this.isAuthoritativeIndexedDb) {
        return { available: true, type: "indexedDB" };
      }
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.getItem(STORAGE_KEYS.QUESTIONS);
        return { available: true, type: "localStorage" };
      }
      return { available: true, type: "memory", error: "window.localStorage não disponível" };
    } catch (e: any) {
      return { available: false, type: "memory", error: e?.message || "Storage bloqueado" };
    }
  }

  /**
   * BOOTSTRAP ASSÍNCRONO DA APLICAÇÃO (Executado durante Splash / Startup)
   * 1. Abre IndexedDB.
   * 2. Verifica metadata de migração.
   * 3. Se pendente ou não iniciada, executa StorageMigrator.
   * 4. Valida integridade profunda.
   * 5. Carrega todos os dados do IndexedDB no cache autoritativo da memória.
   * 6. Marca IndexedDB como fonte AUTORITATIVA.
   */
  public initializeStorage(): Promise<MigrationExecutionResult> {
    if (this.isInitialized) {
      return Promise.resolve({ success: true, status: 'SKIPPED', message: 'Armazenamento já inicializado.' });
    }
    if (!this.initializationPromise) {
      this.initializationPromise = this.bootstrapStorage().finally(() => { this.initializationPromise = null; });
    }
    return this.initializationPromise;
  }

  private async bootstrapStorage(): Promise<MigrationExecutionResult> {
    try {
      const migrationResult = await this.migrator.executeMigration();
      if (!migrationResult.success) throw migrationResult.error || { type: 'VALIDATION_FAILED', message: migrationResult.message };
      const snapshot = await indexedDbStorage.readSnapshot();
      const defaultsInitialized = await indexedDbStorage.getMetadata('defaults_initialized');
      if (!defaultsInitialized) {
        const hasLegacyQuestions = safeStorageGet(STORAGE_KEYS.QUESTIONS) !== null;
        if (!snapshot.questions.length && !snapshot.history.length && !snapshot.sessions.length && !hasLegacyQuestions) {
          snapshot.questions = INITIAL_QUESTIONS.map(normalizeQuestion);
          await indexedDbStorage.putQuestionsBatch(snapshot.questions);
        }
        await indexedDbStorage.putMetadata('defaults_initialized', true);
      }
      if (!snapshot.settings) {
        snapshot.settings = { ...DEFAULT_SETTINGS };
        await indexedDbStorage.putSettings(snapshot.settings);
      }
      if (!snapshot.dailyGoal) {
        snapshot.dailyGoal = LearningEngine.calculateGoalsProgress(snapshot.history, snapshot.settings, new Date());
        await indexedDbStorage.putDailyGoal(snapshot.dailyGoal);
      }
      assertSnapshotData(snapshot);
      const integrity = await storageHealthService.checkIntegrity();
      if (integrity.overall === 'FAIL') throw { type: 'VALIDATION_FAILED', message: integrity.anomalies.join('; ') };
      if (integrity.overall === 'WARNING') this.dispatchStorageError({ type: 'VALIDATION_FAILED', message: integrity.anomalies.join('; ') });
      this.hydrate(snapshot);
      this.isAuthoritativeIndexedDb = true;
      this.isInitialized = true;
      return migrationResult;
    } catch (error: any) {
      this.isAuthoritativeIndexedDb = false;
      this.dispatchStorageError(error);
      return { success: false, status: 'FAILED', message: error?.message || String(error), error };
    }
  }

  // =========================================================================
  // QUESTIONS (Fronteira Síncrona Consumida pelo App e LearningEngine)
  // =========================================================================

  getQuestions(): Question[] {
    if (this.isAuthoritativeIndexedDb && this.questionsCache) {
      return structuredClone(this.questionsCache);
    }

    // Modo pré-migração ou fallback para localStorage
    try {
      const raw = safeStorageGet(STORAGE_KEYS.QUESTIONS);
      if (!raw) {
        const normalizedInitial = INITIAL_QUESTIONS.map(normalizeQuestion);
        return normalizedInitial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeQuestion);
      }
      return INITIAL_QUESTIONS.map(normalizeQuestion);
    } catch (e) {
      console.error("[StorageService] Erro ao ler questões do localStorage:", e);
      return INITIAL_QUESTIONS.map(normalizeQuestion);
    }
  }

  saveQuestions(questions: Question[]): boolean {
    this.assertWritable();
    const normalizedList = questions.map(normalizeQuestion);

    if (this.isAuthoritativeIndexedDb) {
      // 1. Atualiza cache autoritativo imediatamente em memória
      this.questionsCache = normalizedList;

      // 2. Persiste assincronamente no IndexedDB em lote transacional
      const snapshot = structuredClone(normalizedList);
      void this.enqueuePersistence(() => indexedDbStorage.replaceQuestions(snapshot), INDEXED_DB_CONFIG.STORES.QUESTIONS).catch(() => {});

      return true;
    }

    return false;
  }

  saveQuestion(question: Question): Question {
    const list = this.getQuestions();
    const index = list.findIndex((q) => q.id === question.id);
    let result: Question;
    const normalized = normalizeQuestion(question);

    if (index >= 0) {
      result = { ...normalized, updatedAt: new Date().toISOString() };
      list[index] = result;
    } else {
      result = {
        ...normalized,
        createdAt: normalized.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(result);
    }

    this.saveQuestions(list);


    return result;
  }

  addQuestion(partial: Partial<Question>): Question {
    const now = new Date().toISOString();
    const correctOption = (partial.correctOption || "A") as OptionLetter;
    const optionE =
      typeof partial.optionE === "string" && partial.optionE.trim() !== ""
        ? partial.optionE.trim()
        : undefined;

    if (correctOption === "E" && (!optionE || optionE === "")) {
      throw new Error("A alternativa E deve obrigatoriamente existir e estar preenchida quando o gabarito for E.");
    }

    const subject = partial.subject?.trim() || "Geral";
    const discipline =
      typeof partial.discipline === "string" && partial.discipline.trim() !== ""
        ? partial.discipline.trim()
        : subject;

    const newQuestion: Question = {
      id: partial.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      question: partial.question || "",
      optionA: partial.optionA || "",
      optionB: partial.optionB || "",
      optionC: partial.optionC || "",
      optionD: partial.optionD || "",
      optionE,
      correctOption,
      explanation: partial.explanation || "",
      subject,
      discipline,
      topic: partial.topic?.trim() || "Geral",
      difficulty: partial.difficulty || "Médio",
      estimatedTime: partial.estimatedTime || 60,
      tags: partial.tags || [subject],
      origin: partial.origin?.trim() || undefined,
      observation: partial.observation?.trim() || undefined,
      isFavorite: partial.isFavorite ?? false,
      memoryState: partial.memoryState || "NOVA",
      repetitionCount: partial.repetitionCount ?? 0,
      easeFactor: partial.easeFactor ?? 2.5,
      intervalDays: partial.intervalDays ?? 1,
      nextReviewDate: partial.nextReviewDate || new Date().toISOString(),
      lastReviewDate: partial.lastReviewDate,
      correctCount: partial.correctCount ?? 0,
      errorCount: partial.errorCount ?? 0,
      averageTimeSpentMs: partial.averageTimeSpentMs ?? 0,
      lastAnsweredAt: partial.lastAnsweredAt,
      lastWasCorrect: partial.lastWasCorrect,
      createdAt: now,
      updatedAt: now,
    };

    return this.saveQuestion(newQuestion);
  }

  updateQuestion(id: string, updates: Partial<Question>): Question | null {
    const list = this.getQuestions();
    const index = list.findIndex((q) => q.id === id);
    if (index === -1) return null;

    const targetCorrectOption = (updates.correctOption || list[index].correctOption) as OptionLetter;
    const targetOptionE = updates.optionE !== undefined ? updates.optionE : list[index].optionE;

    if (targetCorrectOption === "E" && (!targetOptionE || targetOptionE.trim() === "")) {
      throw new Error("A alternativa E deve obrigatoriamente existir e estar preenchida quando o gabarito for E.");
    }

    const updatedRaw = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updated = normalizeQuestion(updatedRaw);
    list[index] = updated;
    this.saveQuestions(list);


    return updated;
  }

  deleteQuestion(id: string): boolean {
    const list = this.getQuestions();
    const filtered = list.filter((q) => q.id !== id);
    if (filtered.length === list.length) return false;

    this.saveQuestions(filtered);


    return true;
  }

  bulkAddQuestions(newQuestions: Partial<Question>[]): { added: number; ignored: number } {
    const existing = this.getQuestions();
    const existingQuestions = new Set(existing.map((q) => q.question.trim().toLowerCase()));
    const existingIds = new Set(existing.map((q) => q.id));

    let added = 0;
    let ignored = 0;
    const toAdd: Question[] = [];

    for (const raw of newQuestions) {
      const qText = raw.question?.trim().toLowerCase();
      if (!qText || existingQuestions.has(qText)) {
        ignored++;
        continue;
      }

      let id = raw.id;
      if (!id || existingIds.has(id)) {
        id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }

      const subject = raw.subject?.trim() || "Geral";
      const discipline =
        typeof raw.discipline === "string" && raw.discipline.trim() !== ""
          ? raw.discipline.trim()
          : subject;

      const q: Question = normalizeQuestion({
        ...raw,
        id,
        subject,
        discipline,
        topic: raw.topic?.trim() || "Geral",
        difficulty: raw.difficulty || "Médio",
        estimatedTime: raw.estimatedTime || 60,
        tags: raw.tags || [subject],
        isFavorite: raw.isFavorite ?? false,
        memoryState: raw.memoryState || "NOVA",
        repetitionCount: raw.repetitionCount ?? 0,
        easeFactor: raw.easeFactor ?? 2.5,
        intervalDays: raw.intervalDays ?? 1,
        correctCount: raw.correctCount ?? 0,
        errorCount: raw.errorCount ?? 0,
        averageTimeSpentMs: raw.averageTimeSpentMs ?? 0,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toAdd.push(q);
      existingQuestions.add(qText);
      existingIds.add(id);
      added++;
    }

    if (toAdd.length > 0) {
      this.saveQuestions([...existing, ...toAdd]);
    }

    return { added, ignored };
  }

  toggleFavorite(id: string): Question | null {
    const list = this.getQuestions();
    const index = list.findIndex((q) => q.id === id);
    if (index === -1) return null;

    list[index].isFavorite = !list[index].isFavorite;
    list[index].updatedAt = new Date().toISOString();
    this.saveQuestions(list);


    return list[index];
  }

  duplicateQuestion(id: string): Question | null {
    const original = this.getQuestions().find((q) => q.id === id);
    if (!original) return null;

    const duplicateData: Partial<Question> = {
      ...original,
      id: undefined,
      question: `${original.question} (Cópia)`,
      isFavorite: false,
      memoryState: "NOVA",
      repetitionCount: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: undefined,
      lastReviewDate: undefined,
      correctCount: 0,
      errorCount: 0,
      averageTimeSpentMs: 0,
      lastAnsweredAt: undefined,
      lastWasCorrect: undefined,
    };

    return this.addQuestion(duplicateData);
  }

  // =========================================================================
  // ANSWER HISTORY
  // =========================================================================

  getAnswerHistory(): AnswerHistoryRecord[] {
    if (this.isAuthoritativeIndexedDb && this.historyCache) {
      return structuredClone(this.historyCache);
    }

    try {
      const raw = safeStorageGet(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  recordAnswer(record: AnswerHistoryRecord): void {
    this.assertWritable();
    const history = this.getAnswerHistory();
    history.unshift(record);

    if (this.isAuthoritativeIndexedDb) {
      this.historyCache = history;
      const snapshot = structuredClone(record);
      void this.enqueuePersistence(() => indexedDbStorage.putHistoryRecord(snapshot), INDEXED_DB_CONFIG.STORES.HISTORY).catch(() => {});
    }

    // Update Question stats
    const questions = this.getQuestions();
    const qIndex = questions.findIndex((q) => q.id === record.questionId);
    if (qIndex >= 0) {
      const q = questions[qIndex];
      const prevTotal = q.averageTimeSpentMs || 0;
      const count = (q.correctCount || 0) + (q.errorCount || 0);
      const newAvg = count === 0 ? record.timeSpentMs : Math.round((prevTotal * count + record.timeSpentMs) / (count + 1));

      questions[qIndex] = {
        ...q,
        correctCount: record.isCorrect ? (q.correctCount || 0) + 1 : (q.correctCount || 0),
        errorCount: !record.isCorrect ? (q.errorCount || 0) + 1 : (q.errorCount || 0),
        lastAnsweredAt: record.timestamp,
        lastWasCorrect: record.isCorrect,
        averageTimeSpentMs: newAvg,
        updatedAt: new Date().toISOString(),
      };
      this.saveQuestions(questions);
    }

    this.incrementDailyGoalCount(1);
  }

  saveAnswerHistoryBatch(newRecords: AnswerHistoryRecord[]): void {
    this.assertWritable();
    if (!newRecords || newRecords.length === 0) return;
    const history = this.getAnswerHistory();
    history.unshift(...newRecords);

    if (this.isAuthoritativeIndexedDb) {
      this.historyCache = history;
      const snapshot = structuredClone(newRecords);
      void this.enqueuePersistence(async () => { await indexedDbStorage.putHistoryBatch(snapshot); }, INDEXED_DB_CONFIG.STORES.HISTORY).catch(() => {});
    }
  }

  clearAnswerHistory(): void {
    this.assertWritable();
    if (this.isAuthoritativeIndexedDb) {
      this.historyCache = [];
      void this.enqueuePersistence(() => indexedDbStorage.clearStore(INDEXED_DB_CONFIG.STORES.HISTORY), INDEXED_DB_CONFIG.STORES.HISTORY).catch(() => {});
    }
  }

  // =========================================================================
  // SESSIONS
  // =========================================================================

  getStudySessions(): StudySession[] {
    if (this.isAuthoritativeIndexedDb && this.sessionsCache) {
      return structuredClone(this.sessionsCache);
    }

    try {
      const raw = safeStorageGet(STORAGE_KEYS.SESSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveStudySession(session: StudySession): void {
    this.assertWritable();
    const sessions = this.getStudySessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }

    if (this.isAuthoritativeIndexedDb) {
      this.sessionsCache = sessions;
      const snapshot = structuredClone(session);
      void this.enqueuePersistence(() => indexedDbStorage.putSession(snapshot), INDEXED_DB_CONFIG.STORES.SESSIONS).catch(() => {});
    }
  }

  // =========================================================================
  // DAILY GOAL (Fase 3F)
  // =========================================================================

  getDailyGoal(): DailyGoalProgress {
    const history = this.getAnswerHistory();
    const settings = this.getSettings();
    let legacy: Partial<DailyGoalProgress> | undefined;

    if (this.isAuthoritativeIndexedDb && this.dailyGoalCache) {
      legacy = this.dailyGoalCache;
    } else {
      try {
        const raw = safeStorageGet(STORAGE_KEYS.DAILY_GOAL);
        if (raw) legacy = JSON.parse(raw);
      } catch {
        // fallback
      }
    }

    const progress = LearningEngine.calculateGoalsProgress(
      history,
      settings,
      new Date(),
      legacy
    );
    return progress;
  }

  saveDailyGoal(goal: DailyGoalProgress): void {
    this.assertWritable();
    if (this.isAuthoritativeIndexedDb) {
      this.dailyGoalCache = goal;
      const snapshot = structuredClone(goal);
      void this.enqueuePersistence(() => indexedDbStorage.putDailyGoal(snapshot), INDEXED_DB_CONFIG.STORES.GOALS).catch(() => {});
    }
  }

  incrementDailyGoalCount(increment = 1): DailyGoalProgress {
    const progress = this.getDailyGoal();
    this.saveDailyGoal(progress);
    return progress;
  }

  updateDailyGoalTarget(target: number): DailyGoalProgress {
    this.saveSettings({ dailyGoalTarget: target });
    return this.getDailyGoal();
  }

  updateStudyGoals(goals: {
    questionsTarget?: number;
    timeMinutesTarget?: number;
    weeklyDaysTarget?: number;
  }): DailyGoalProgress {
    const partial: Partial<UserSettings> = {};
    if (goals.questionsTarget !== undefined) partial.dailyGoalTarget = goals.questionsTarget;
    if (goals.timeMinutesTarget !== undefined) partial.dailyTimeGoalMinutes = goals.timeMinutesTarget;
    if (goals.weeklyDaysTarget !== undefined) partial.weeklyDaysGoalTarget = goals.weeklyDaysTarget;
    this.saveSettings(partial);
    return this.getDailyGoal();
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================

  getSettings(): UserSettings {
    if (this.isAuthoritativeIndexedDb && this.settingsCache) {
      return { ...this.settingsCache };
    }

    try {
      const raw = safeStorageGet(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  getUserSettings(): UserSettings {
    return this.getSettings();
  }

  saveSettings(partial: Partial<UserSettings>): UserSettings {
    this.assertWritable();
    const current = this.getSettings();
    const updated = { ...current, ...partial };

    if (this.isAuthoritativeIndexedDb) {
      this.settingsCache = updated;
      const snapshot = structuredClone(updated);
      void this.enqueuePersistence(() => indexedDbStorage.putSettings(snapshot), INDEXED_DB_CONFIG.STORES.SETTINGS).catch(() => {});
    }

    return updated;
  }

  updateUserSettings(partial: Partial<UserSettings>): UserSettings {
    return this.saveSettings(partial);
  }

  getDailyGoalProgress(): DailyGoalProgress {
    return this.getDailyGoal();
  }

  // =========================================================================
  // BACKUP & RESTORE (Utiliza SEMPRE os Dados Autoritativos)
  // =========================================================================

  async mergeCloudStudyData(questions: Question[], history: AnswerHistoryRecord[], guard?: () => Promise<void>): Promise<void> {
    await this.flushWrites();
    const byId = new Map(this.getQuestions().map((q) => [q.id, q]));
    for (const question of questions) if (!byId.has(question.id)) byId.set(question.id, normalizeQuestion(question));
    const mergedHistory = mergeHistory(this.getAnswerHistory(), history);
    const settings = this.getSettings();
    const snapshot: StorageSnapshot = {
      questions: [...byId.values()], history: mergedHistory, sessions: this.getStudySessions(), settings,
      dailyGoal: LearningEngine.calculateGoalsProgress(mergedHistory, settings, new Date()),
    };
    assertSnapshotData(snapshot);
    await this.replaceSnapshot(snapshot, guard);
  }

  exportFullBackupJSON(): string {
    const data = {
      version: "MEMORA+_v1.0",
      exportDate: new Date().toISOString(),
      storageSource: this.isAuthoritativeIndexedDb ? "IndexedDB" : "localStorage",
      questions: this.getQuestions(),
      history: this.getAnswerHistory(),
      sessions: this.getStudySessions(),
      settings: this.getSettings(),
      dailyGoal: this.getDailyGoal(),
    };
    return JSON.stringify(data, null, 2);
  }

  exportFullBackupJson(): string {
    return this.exportFullBackupJSON();
  }

  async importFullBackupJSON(jsonString: string): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      this.assertWritable();
      const parsed = JSON.parse(jsonString);
      assertStoredRecords(parsed.questions, 'questions');
      const history = parsed.history ?? [];
      const sessions = parsed.sessions ?? [];
      assertStoredRecords(history, 'history');
      assertStoredRecords(sessions, 'sessions');
      assertOptionalObject(parsed.settings ?? null, 'settings');
      assertOptionalObject(parsed.dailyGoal ?? null, 'dailyGoal');
      assertSnapshotData({ questions: parsed.questions as Question[], history: history as AnswerHistoryRecord[], sessions: sessions as StudySession[], settings: parsed.settings ?? null, dailyGoal: parsed.dailyGoal ?? null });
      const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      const snapshot: StorageSnapshot = {
        questions: parsed.questions.map(normalizeQuestion), history: history as AnswerHistoryRecord[], sessions: sessions as StudySession[], settings,
        dailyGoal: parsed.dailyGoal ?? LearningEngine.calculateGoalsProgress(history as AnswerHistoryRecord[], settings, new Date()),
      };
      assertSnapshotData(snapshot);
      await this.replaceSnapshot(snapshot);
      return { success: true, message: 'Backup restaurado e salvo! ' + snapshot.questions.length + ' questões.', count: snapshot.questions.length };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Arquivo inválido ou falha ao salvar.' };
    }
  }

  async importFullBackupJson(jsonString: string): Promise<boolean> {
    return (await this.importFullBackupJSON(jsonString)).success;
  }

  async resetDatabaseToDefaults(): Promise<void> {
    this.assertWritable();
    const settings = { ...DEFAULT_SETTINGS };
    const snapshot: StorageSnapshot = {
      questions: INITIAL_QUESTIONS.map(normalizeQuestion), history: [], sessions: [],
      settings, dailyGoal: LearningEngine.calculateGoalsProgress([], settings, new Date()),
    };
    await this.replaceSnapshot(snapshot);
  }

  async resetToDefaults(): Promise<void> {
    await this.resetDatabaseToDefaults();
  }

  // REQUIREMENT 49: Large Volume Stress Test Generator
  generateStressTestQuestions(count: number): Question[] {
    const subjects = [
      { name: "Língua Portuguesa", topics: ["Crase", "Sintaxe", "Pontuação", "Concordância", "Semântica"] },
      { name: "Direito Constitucional", topics: ["Direitos Fundamentais", "Poder Judiciário", "Controle de Constitucionalidade", "Organização do Estado"] },
      { name: "Matemática & RLM", topics: ["Porcentagem", "Equações", "Lógica Proposicional", "Análise Combinatória", "Probabilidade"] },
      { name: "Informática", topics: ["Segurança da Informação", "Redes de Computadores", "Banco de Dados", "Sistemas Operacionais"] },
      { name: "Direito Administrativo", topics: ["Atos Administrativos", "Poderes", "Licitações", "Servidores Públicos"] },
    ];

    const difficulties: ("Fácil" | "Médio" | "Difícil")[] = ["Fácil", "Médio", "Difícil"];
    const letters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    const memoryStates: ("NOVA" | "APRENDENDO" | "REVISAR" | "DOMINADA")[] = ["NOVA", "APRENDENDO", "REVISAR", "DOMINADA"];

    const generated: Question[] = [];
    const baseTimestamp = Date.now();

    for (let i = 1; i <= count; i++) {
      const subjObj = subjects[i % subjects.length];
      const topic = subjObj.topics[i % subjObj.topics.length];
      const correct = letters[i % 4];
      const diff = difficulties[i % 3];
      const state = memoryStates[i % 4];

      generated.push({
        id: `stress-test-${baseTimestamp}-${i}`,
        question: `[Questão Sintética #${i}] Acerca dos preceitos fundamentais de ${subjObj.name}, especificamente sobre o tema de ${topic}, assinale a assertiva técnica correta:`,
        optionA: `Afirmação preliminar A com análise conceitual de ${topic} sob o prisma doutrinário aplicável.`,
        optionB: `Enunciado correlato B detalhando parâmetros operacionais e exceções jurisprudenciais relativas a ${topic}.`,
        optionC: `Critério técnico C estabelecendo correlações estruturadas e premissas metodológicas em ${subjObj.name}.`,
        optionD: `Proposição alternativa D contemplando a evolução dos institutos normativos em ${topic}.`,
        correctOption: correct,
        explanation: `Justificativa pedagógica da Questão #${i}: A alternativa correta é a letra ${correct}, pois reproduz a regra fundamental de ${topic} em ${subjObj.name}.`,
        discipline: subjObj.name,
        subject: subjObj.name,
        topic: topic,
        difficulty: diff,
        estimatedTime: 60,
        tags: [subjObj.name, topic, "StressTest"],
        isFavorite: i % 10 === 0,
        memoryState: state,
        repetitionCount: state === "DOMINADA" ? 4 : state === "APRENDENDO" ? 2 : 0,
        easeFactor: 2.5,
        intervalDays: state === "DOMINADA" ? 14 : 1,
        nextReviewDate: new Date(baseTimestamp + (state === "REVISAR" ? -3600000 : 86400000)).toISOString(),
        errorCount: state === "REVISAR" ? 2 : 0,
        correctCount: state === "DOMINADA" ? 4 : 1,
        averageTimeSpentMs: 35000,
        createdAt: new Date(baseTimestamp - i * 1000).toISOString(),
        updatedAt: new Date(baseTimestamp - i * 1000).toISOString(),
      });
    }

    return generated;
  }
}

export const StorageService = new StorageServiceManager();
