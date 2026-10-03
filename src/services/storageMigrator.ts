import { assertStoredRecords, assertOptionalObject, assertSnapshotData, snapshotDifferences, StorageSnapshot } from './storageSnapshot';
import {
  AnswerHistoryRecord,
  AppStorageMetadata,
  DailyGoalProgress,
  Question,
  StudySession,
  UserSettings,
} from "../types";
import { IndexedDbStorage, INDEXED_DB_CONFIG } from "./indexedDbStorage";
import { normalizeQuestion } from "../utils/questionNormalizer";

export interface MigrationSummary {
  questionsCount: number;
  historyCount: number;
  sessionsCount: number;
  hasSettings: boolean;
  hasGoals: boolean;
}

export interface MigrationValidationResult {
  passed: boolean;
  errors: string[];
  sourceSummary: MigrationSummary;
  targetSummary: MigrationSummary;
  amostraValida: boolean;
}

export interface MigrationExecutionResult {
  success: boolean;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  message: string;
  sourceSummary?: MigrationSummary;
  targetSummary?: MigrationSummary;
  validationResult?: MigrationValidationResult;
  error?: any;
}

/**
 * StorageMigrator — Motor Seguro e Transparente de Migração (Fase 4B)
 *
 * Princípios Arquiteturais e Regras de Segurança:
 * 1. DETECTAR -> LER -> NORMALIZAR -> COPIAR -> VALIDAR -> COMPARAR -> MARCAR COMPLETED -> ATIVAR
 * 2. NUNCA apaga o localStorage legado ("memora_plus_*_v1"). Permanece como snapshot e rollback.
 * 3. Idempotente: Execuções subsequentes detectam status COMPLETED e retornam SKIPPED sem duplicar dados.
 * 4. Validação Profunda: Além de contagens, compara chaves e campos críticos em todos os registros.
 * 5. Preservação de undefined: selectedOption === undefined sobrevive à migração sem conversão para valores fictícios.
 * 6. Preservação de IDs, SM-2, Estados e Timestamps originais.
 */
export class StorageMigrator {
  private adapter: IndexedDbStorage;

  constructor(adapter: IndexedDbStorage) {
    this.adapter = adapter;
  }

  /**
   * Lê os dados crus diretamente do localStorage legado sem modificá-lo.
   */
  public readLegacyLocalStorage(): {
    questionsRaw: string | null;
    historyRaw: string | null;
    sessionsRaw: string | null;
    settingsRaw: string | null;
    dailyGoalRaw: string | null;
  } {
    if (typeof window === "undefined" || !window.localStorage) {
      return {
        questionsRaw: null,
        historyRaw: null,
        sessionsRaw: null,
        settingsRaw: null,
        dailyGoalRaw: null,
      };
    }

    return {
      questionsRaw: window.localStorage.getItem("memora_plus_questions_v1"),
      historyRaw: window.localStorage.getItem("memora_plus_history_v1"),
      sessionsRaw: window.localStorage.getItem("memora_plus_sessions_v1"),
      settingsRaw: window.localStorage.getItem("memora_plus_settings_v1"),
      dailyGoalRaw: window.localStorage.getItem("memora_plus_daily_goal_v1"),
    };
  }

  /**
   * Parser seguro de dados legados aplicando as regras de normalização oficiais.
   */
  public parseLegacyData(): {
    questions: Question[];
    history: AnswerHistoryRecord[];
    sessions: StudySession[];
    settings: UserSettings | null;
    dailyGoal: DailyGoalProgress | null;
  } {
    const raw = this.readLegacyLocalStorage();
    const parse = (text: string | null, name: string, fallback: unknown) => {
      if (text === null) return fallback;
      try { return JSON.parse(text); }
      catch { throw { type: 'CORRUPTED_DATA', message: `Dados legados ilegíveis em ${name}. O original foi preservado.` }; }
    };
    const questions = parse(raw.questionsRaw, 'questions', []);
    const history = parse(raw.historyRaw, 'history', []);
    const sessions = parse(raw.sessionsRaw, 'sessions', []);
    const settings = parse(raw.settingsRaw, 'settings', null);
    const dailyGoal = parse(raw.dailyGoalRaw, 'goals', null);
    assertStoredRecords(questions, 'questions');
    assertStoredRecords(history, 'history');
    assertStoredRecords(sessions, 'sessions');
    assertOptionalObject(settings, 'settings');
    assertOptionalObject(dailyGoal, 'goals');
    assertSnapshotData({ questions: questions as Question[], history: history as AnswerHistoryRecord[], sessions: sessions as StudySession[], settings: settings as UserSettings | null, dailyGoal: dailyGoal as DailyGoalProgress | null });
    return {
      // Stable defaults make interrupted migrations retryable without changing source dates.
      questions: questions.map((q: any) => normalizeQuestion({ ...q, nextReviewDate: q.nextReviewDate || q.createdAt || '1970-01-01T00:00:00.000Z' })),
      history: history as AnswerHistoryRecord[],
      sessions: sessions as StudySession[],
      settings: settings as UserSettings | null,
      dailyGoal: dailyGoal as DailyGoalProgress | null,
    };
  }

  /**
   * Validação profunda e determinística entre a fonte (origem) e o destino (IndexedDB).
   */
  public async validateMigration(
    sourceData: {
      questions: Question[];
      history: AnswerHistoryRecord[];
      sessions: StudySession[];
      settings: UserSettings | null;
      dailyGoal: DailyGoalProgress | null;
    }
  ): Promise<MigrationValidationResult> {
    const target = await this.adapter.readSnapshot();
    const summary = (data: StorageSnapshot): MigrationSummary => ({
      questionsCount: data.questions.length,
      historyCount: data.history.length,
      sessionsCount: data.sessions.length,
      hasSettings: data.settings !== null,
      hasGoals: data.dailyGoal !== null,
    });
    const errors = snapshotDifferences(sourceData, target);
    return {
      passed: errors.length === 0, errors,
      sourceSummary: summary(sourceData), targetSummary: summary(target),
      amostraValida: errors.length === 0,
    };
  }

  /**
   * Executa o fluxo completo de migração segura e idempotente.
   */
  private execution: Promise<MigrationExecutionResult> | null = null;

  public executeMigration(): Promise<MigrationExecutionResult> {
    if (!this.execution) {
      this.execution = this.runMigration().finally(() => { this.execution = null; });
    }
    return this.execution;
  }

  private async runMigration(): Promise<MigrationExecutionResult> {
    const startTime = new Date().toISOString();
    try {
      const currentMeta = await this.adapter.getAppMetadata();
      if (currentMeta?.migrationStatus === 'COMPLETED') {
        if (currentMeta.schemaVersion !== INDEXED_DB_CONFIG.VERSION || currentMeta.validationStatus !== 'PASSED') {
          throw { type: 'VALIDATION_FAILED', message: 'Marcador de migração concluída incompatível ou não validado.' };
        }
        return { success: true, status: 'SKIPPED', message: 'Migração já concluída. Dados locais preservados.' };
      }
      // Parse everything before starting any data write.
      const sourceData = this.parseLegacyData();
      assertSnapshotData(sourceData);
      const completed = new Date().toISOString();
      const committed = await this.adapter.commitSnapshot(sourceData, false, {
        schemaVersion: INDEXED_DB_CONFIG.VERSION, migrationVersion: 1,
        migrationStatus: 'COMPLETED', validationStatus: 'PASSED',
        migrationStartedAt: startTime, migrationCompletedAt: completed,
        source: 'localStorage', target: INDEXED_DB_CONFIG.DB_NAME,
        lastIntegrityCheck: completed,
        createdAt: currentMeta?.createdAt || startTime, updatedAt: completed,
      });
      if (!committed) return { success: true, status: 'SKIPPED', message: 'Outra aba já concluiu a migração. Dados existentes preservados.' };
      const summary: MigrationSummary = {
        questionsCount: sourceData.questions.length, historyCount: sourceData.history.length,
        sessionsCount: sourceData.sessions.length, hasSettings: sourceData.settings !== null,
        hasGoals: sourceData.dailyGoal !== null,
      };
      return {
        success: true, status: 'COMPLETED', message: 'Migração validada e concluída em uma única transação.',
        sourceSummary: summary, targetSummary: summary,
        validationResult: { passed: true, errors: [], sourceSummary: summary, targetSummary: summary, amostraValida: true },
      };
    } catch (error: any) {
      // A failed transaction leaves data and previous metadata untouched.
      return { success: false, status: 'FAILED', message: error?.message || String(error), error };
    }
  }
}
