import { recordProblems } from './storageSnapshot';
import {
  IntegrityCheckReport,
  PersistenceStatus,
  StorageErrorDetail,
  StorageErrorType,
  StorageHealth,
  StorageHealthStatus,
  StoreIntegrityItem,
} from "../types";
import { indexedDbStorage, INDEXED_DB_CONFIG } from "./indexedDbStorage";

/**
 * Helper de formatação legível e segura para bytes, KB, MB, GB
 */
export function formatBytes(bytes?: number, decimals = 1): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return "0 B";
  }
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * StorageHealthService — Monitoramento de Quota, Integridade e Resiliência (Fase 4C)
 *
 * Responsabilidades:
 * 1. estimateStorage(): Consulta a Storage Manager API (`navigator.storage.estimate()`).
 * 2. checkPersistence(): Inspeciona e solicita de forma controlada persistência durável (`navigator.storage.persisted()`).
 * 3. getStorageHealth(): Avalia thresholds e classifica o estado (HEALTHY < 70%, WARNING 70-84.99%, CRITICAL >= 85%).
 * 4. checkIntegrity(): Verificação determinística e não-destrutiva de todas as object stores, metadados e integridade referencial.
 * 5. classifyStorageError(): Mapeador de exceções para tipos estruturados `StorageErrorDetail`.
 */
export class StorageHealthService {
  private lastHealthCheck: StorageHealth | null = null;
  private lastIntegrityReport: IntegrityCheckReport | null = null;
  private hasRequestedPersistence = false;

  public invalidateIntegrity(): void {
    this.lastIntegrityReport = null;
  }

  /**
   * Thresholds de Quota (UX Preventiva):
   * < 70%: HEALTHY
   * 70% - 84.99%: WARNING (sugere backup sem bloquear estudo)
   * >= 85%: CRITICAL (alerta de saturação próxima)
   */
  public readonly THRESHOLDS = {
    WARNING_PERCENT: 70,
    CRITICAL_PERCENT: 85,
  };

  /**
   * Helper para classificar exceções em StorageErrorDetail padronizado
   */
  public classifyStorageError(error: any, storeName?: string): StorageErrorDetail {
    if (!error) {
      return {
        type: "UNKNOWN",
        message: "Erro não identificado no armazenamento.",
        storeName,
      };
    }

    // Se já for um StorageErrorDetail estruturado
    if (error.type && error.message) {
      return error as StorageErrorDetail;
    }

    const errName = error.name || "";
    const errMsg = error.message || String(error);

    if (
      errName === "QuotaExceededError" ||
      errName === "NS_ERROR_DOM_QUOTA_REACHED" ||
      errMsg.includes("quota") ||
      errMsg.includes("Quota") ||
      error.code === 22 ||
      error.code === 1014
    ) {
      return {
        type: "QUOTA_EXCEEDED",
        message: "Limite de armazenamento do dispositivo excedido. O navegador não pôde gravar os novos dados.",
        storeName,
        originalError: errMsg,
      };
    }

    if (
      errName === "InvalidStateError" ||
      errMsg.includes("database is closed") ||
      errMsg.includes("Database not available")
    ) {
      return {
        type: "DATABASE_UNAVAILABLE",
        message: "O banco de dados IndexedDB não está disponível ou foi fechado.",
        storeName,
        originalError: errMsg,
      };
    }

    if (
      errName === "AbortError" ||
      errMsg.includes("aborted") ||
      errMsg.includes("abort")
    ) {
      return {
        type: "ABORTED",
        message: "A transação de gravação foi abortada antes da conclusão.",
        storeName,
        originalError: errMsg,
      };
    }

    if (
      errName === "VersionError" ||
      errMsg.includes("version")
    ) {
      return {
        type: "VERSION_ERROR",
        message: "Incompatibilidade de versão do banco de dados local.",
        storeName,
        originalError: errMsg,
      };
    }

    if (
      errName === "DataError" ||
      errMsg.includes("Key not valid")
    ) {
      return {
        type: "INVALID_DATA",
        message: "Formato de dados inválido para persistência.",
        storeName,
        originalError: errMsg,
      };
    }

    return {
      type: "TRANSACTION_FAILED",
      message: `Falha na operação de persistência: ${errMsg}`,
      storeName,
      originalError: errMsg,
    };
  }

  /**
   * Consulta a StorageManager API nativa do navegador
   */
  public async estimateStorage(): Promise<{
    supported: boolean;
    usageBytes?: number;
    quotaBytes?: number;
    usagePercentage?: number;
  }> {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.storage &&
        typeof navigator.storage.estimate === "function"
      ) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage !== undefined ? estimate.usage : 0;
        const quotaBytes = estimate.quota !== undefined ? estimate.quota : 0;

        if (!Number.isFinite(usageBytes) || usageBytes < 0 || !Number.isFinite(quotaBytes) || quotaBytes <= 0) return { supported: false };
        let usagePercentage = 0;
        if (quotaBytes > 0) {
          usagePercentage = (usageBytes / quotaBytes) * 100;
        }

        return {
          supported: true,
          usageBytes,
          quotaBytes,
          usagePercentage,
        };
      }
    } catch (err) {
      console.warn("[StorageHealthService] Erro ao consultar navigator.storage.estimate():", err);
    }

    return {
      supported: false,
    };
  }

  /**
   * Verifica o status de armazenamento durável (persisted) e solicita 1 única vez se conveniente
   */
  public async checkPersistence(requestIfAllowed = false): Promise<{
    supported: boolean;
    status: PersistenceStatus;
    persistent: boolean;
  }> {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.storage &&
        typeof navigator.storage.persisted === "function"
      ) {
        let isPersisted = await navigator.storage.persisted();

        if (!isPersisted && requestIfAllowed && !this.hasRequestedPersistence && typeof navigator.storage.persist === "function") {
          this.hasRequestedPersistence = true;
          try {
            isPersisted = await navigator.storage.persist();
          } catch (e) {
            // Ignora negação ou bloqueio de permissão
          }
        }

        return {
          supported: true,
          status: isPersisted ? "GRANTED" : "DENIED",
          persistent: isPersisted,
        };
      }
    } catch (err) {
      console.warn("[StorageHealthService] Erro ao inspecionar persistência:", err);
    }

    return {
      supported: false,
      status: "UNSUPPORTED",
      persistent: false,
    };
  }

  /**
   * Retorna o diagnóstico completo consolidado de saúde do armazenamento
   */
  public async getStorageHealth(): Promise<StorageHealth> {
    const estimate = await this.estimateStorage();
    const persistence = await this.checkPersistence(false);
    const nowIso = new Date().toISOString();

    let status: StorageHealthStatus = "HEALTHY";
    let statusMessage = "Armazenamento em estado saudável.";

    if (!estimate.supported) {
      status = "UNSUPPORTED";
      statusMessage = "Estimativa de quota indisponível neste navegador (Storage Manager API não suportada).";
    } else if (estimate.usagePercentage !== undefined) {
      if (estimate.usagePercentage >= this.THRESHOLDS.CRITICAL_PERCENT) {
        status = "CRITICAL";
        statusMessage = `Atenção Crítica: O armazenamento atingiu ${estimate.usagePercentage}% do limite estimado. Novas gravações podem falhar se o navegador não expandir o espaço.`;
      } else if (estimate.usagePercentage >= this.THRESHOLDS.WARNING_PERCENT) {
        status = "WARNING";
        statusMessage = `Aviso de Quota: O armazenamento atingiu ${estimate.usagePercentage}% do limite estimado. Recomendamos exportar um backup JSON de segurança.`;
      } else {
        status = "HEALTHY";
        statusMessage = `Armazenamento da origem: ${estimate.usagePercentage.toFixed(2)}% utilizado (inclui caches).`;
      }
    }

    const health: StorageHealth = {
      status,
      storageManagerSupported: estimate.supported,
      usageBytes: estimate.usageBytes,
      quotaBytes: estimate.quotaBytes,
      usagePercentage: estimate.usagePercentage,
      persistenceStatus: persistence.status,
      persistent: persistence.persistent,
      integrityStatus: this.lastIntegrityReport?.overall || "NOT_RUN",
      lastCheck: nowIso,
      statusMessage,
    };

    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Solicita persistência durável ao navegador sob demanda (ação explícita do usuário)
   */
  public async requestPersistentStorage(): Promise<{ success: boolean; status: PersistenceStatus }> {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.storage &&
        typeof navigator.storage.persist === "function"
      ) {
        this.hasRequestedPersistence = true;
        const granted = await navigator.storage.persist();
        return {
          success: granted,
          status: granted ? "GRANTED" : "DENIED",
        };
      }
    } catch (err) {
      console.warn("[StorageHealthService] Erro ao solicitar persistência:", err);
    }
    return {
      success: false,
      status: "UNSUPPORTED",
    };
  }

  /**
   * VERIFICAÇÃO DE INTEGRIDADE DETERMINÍSTICA E NÃO-DESTRUTIVA
   *
   * Verifica:
   * 1. Abertura do IndexedDB.
   * 2. Presença das 6 stores obrigatórias.
   * 3. SchemaVersion e migrationStatus no store metadata.
   * 4. Leitura e contagem de cada store.
   * 5. Integridade referencial (history.questionId -> Question.id).
   * 6. Relatório datado em memória, sem modificar registros ou metadados.
   *
   * REGRA CRÍTICA: Anomalias são detectadas, classificadas e reportadas,
   * NUNCA apagadas ou reparadas automaticamente sem consentimento.
   */
  public async checkIntegrity(): Promise<IntegrityCheckReport> {
    const report: IntegrityCheckReport = {
      overall: 'PASS', timestamp: new Date().toISOString(), schemaVersion: 0,
      migrationStatus: 'UNKNOWN', stores: [], questionsCount: 0, historyCount: 0,
      sessionsCount: 0, hasSettings: false, hasGoals: false, orphanHistoryCount: 0, anomalies: [],
    };
    const warn = (message: string) => {
      report.anomalies.push(message);
      if (report.overall !== 'FAIL') report.overall = 'WARNING';
    };
    try {
      const db = await indexedDbStorage.getDb();
      for (const name of Object.values(INDEXED_DB_CONFIG.STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          report.overall = 'FAIL';
          report.anomalies.push('Store obrigatória ausente: ' + name);
          report.stores.push({ name, count: 0, status: 'ERROR', message: 'Store ausente' });
        }
      }
      if (report.overall === 'FAIL') { this.lastIntegrityReport = report; return report; }
      const snapshot = await indexedDbStorage.readSnapshot();
      const meta = await indexedDbStorage.getAppMetadata();
      const metadataCount = await indexedDbStorage.count(INDEXED_DB_CONFIG.STORES.METADATA);
      report.stores.push({ name: 'metadata', count: metadataCount, status: meta ? 'OK' : 'WARNING' });
      if (!meta) warn('Metadados da aplicação ausentes.');
      else {
        report.schemaVersion = meta.schemaVersion;
        report.migrationStatus = meta.migrationStatus;
        if (meta.schemaVersion !== INDEXED_DB_CONFIG.VERSION) {
          report.overall = 'FAIL';
          report.anomalies.push('Versão de schema incompatível: ' + meta.schemaVersion);
          report.stores[0].status = 'ERROR';
        }
        if (meta.migrationStatus !== 'COMPLETED' || meta.validationStatus !== 'PASSED') {
          warn('Migração incompleta ou sem validação confirmada.');
          if (report.stores[0].status !== 'ERROR') report.stores[0].status = 'WARNING';
        }
      }
      for (const name of ['questions', 'history', 'sessions'] as const) {
        const records = snapshot[name];
        const problems = records.flatMap((record) => recordProblems(name, record));
        report.stores.push({ name, count: records.length, status: problems.length ? 'WARNING' : 'OK' });
        if (problems.length) warn(problems.join('; '));
      }
      report.questionsCount = snapshot.questions.length;
      report.historyCount = snapshot.history.length;
      report.sessionsCount = snapshot.sessions.length;
      const ids = new Set(snapshot.questions.map((q) => q.id));
      report.orphanHistoryCount = snapshot.history.filter((h) => !ids.has(h.questionId)).length;
      if (report.orphanHistoryCount) {
        warn('Históricos órfãos: ' + report.orphanHistoryCount + '. Os registros foram preservados.');
        report.stores.find((store) => store.name === 'history')!.status = 'WARNING';
      }
      const missingSessionReferences = snapshot.sessions.reduce((count, session) => count + (Array.isArray(session.questionIds) ? session.questionIds.filter((id) => !ids.has(id)).length : 0), 0);
      if (missingSessionReferences) {
        warn('Referências de sessões a questões ausentes: ' + missingSessionReferences);
        report.stores.find((store) => store.name === 'sessions')!.status = 'WARNING';
      }
      report.hasSettings = snapshot.settings !== null;
      report.hasGoals = snapshot.dailyGoal !== null;
      for (const [name, value] of [['settings', snapshot.settings], ['goals', snapshot.dailyGoal]] as const) {
        const count = await indexedDbStorage.count(name);
        const problems = value === null ? [name + ': registro current ausente.'] : recordProblems(name, value);
        if (count !== 1) problems.push(name + ': quantidade inesperada de registros: ' + count);
        report.stores.push({ name, count, status: problems.length ? 'WARNING' : 'OK' });
        if (problems.length) warn(problems.join('; '));
      }
      // Read-only: an inspection never overwrites metadata or removes anomalies.
    } catch (error: any) {
      report.overall = 'FAIL';
      report.anomalies.push('Falha ao inspecionar banco: ' + (error?.message || String(error)));
    }
    this.lastIntegrityReport = report;
    return report;
  }
}

export const storageHealthService = new StorageHealthService();
