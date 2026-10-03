import { sameStoredValue, snapshotDifferences, StorageSnapshot } from './storageSnapshot';
import {
  AnswerHistoryRecord,
  AppStorageMetadata,
  DailyGoalProgress,
  Question,
  StorageErrorDetail,
  StudySession,
  UserSettings,
} from "../types";

/**
 * IndexedDbStorage — Adaptador Nativo e Fundação de Persistência Robusta (Fase 4A)
 *
 * Princípios Arquiteturais:
 * 1. Nativo e Zero-Dependency: Utiliza a API padrão IndexedDB do browser, sem inflar o bundle.
 * 2. Versionamento e Stores Rígidos:
 *    - Database: "memora_plus_db"
 *    - Versão: 1
 *    - Stores:
 *      * "questions" (keyPath: "id")
 *      * "history"   (keyPath: "id")
 *      * "sessions"  (keyPath: "id")
 *      * "settings"  (keyPath: "id") -> chave única "current"
 *      * "goals"     (keyPath: "id") -> chave única "current"
 *      * "metadata"  (keyPath: "key") -> registros de controle do motor
 * 3. Preservação de Tipos & undefined:
 *    - selectedOption?: OptionLetter (se for undefined, o IndexedDB preserva a ausência do campo
 *      sem forçar conversão para "A", "B" ou strings artificiais).
 * 4. Transacionalidade e Atomização:
 *    - Permite gravações em lote (`batchPut`) na mesma transação.
 *    - Se qualquer erro ocorrer, a transação aborta integralmente sem dados parciais corrompidos.
 * 5. Não-destrutivo:
 *    - Não toca no localStorage atual (preserva "memora_plus_*_v1").
 *    - Não executa migração automática prematura nesta etapa.
 */

export const INDEXED_DB_CONFIG = {
  DB_NAME: "memora_plus_db",
  VERSION: 1,
  STORES: {
    QUESTIONS: "questions",
    HISTORY: "history",
    SESSIONS: "sessions",
    SETTINGS: "settings",
    GOALS: "goals",
    METADATA: "metadata",
  } as const,
};

export type StoreName = (typeof INDEXED_DB_CONFIG.STORES)[keyof typeof INDEXED_DB_CONFIG.STORES];

export class IndexedDbStorage {
  private dbInstance: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Helper para padronizar erros estruturados do IndexedDB.
   */
  private formatError(
    type: StorageErrorDetail["type"],
    message: string,
    storeName?: string,
    originalError?: any
  ): StorageErrorDetail {
    return {
      type,
      message,
      storeName,
      originalError: originalError?.message || originalError || undefined,
    };
  }

  /**
   * Abre e inicializa a conexão com o banco de dados IndexedDB de forma segura.
   */
  public async getDb(): Promise<IDBDatabase> {
    if (this.dbInstance) {
      return this.dbInstance;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      // Suporte para ambientes Node.js (testes automatizados) ou navegadores sem IndexedDB
      const idb =
        typeof window !== "undefined" && window.indexedDB
          ? window.indexedDB
          : typeof globalThis !== "undefined" && (globalThis as any).indexedDB
          ? (globalThis as any).indexedDB
          : null;

      if (!idb) {
        reject(
          this.formatError(
            "OPEN_FAILED",
            "IndexedDB não está disponível no ambiente de execução."
          )
        );
        return;
      }

      let blocked = false;
      const request = idb.open(
        INDEXED_DB_CONFIG.DB_NAME,
        INDEXED_DB_CONFIG.VERSION
      );

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;

        // 1. Store: Questions (keyPath: "id")
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.QUESTIONS)) {
          const qStore = db.createObjectStore(INDEXED_DB_CONFIG.STORES.QUESTIONS, {
            keyPath: "id",
          });
          qStore.createIndex("by_discipline", "discipline", { unique: false });
          qStore.createIndex("by_memoryState", "memoryState", { unique: false });
          qStore.createIndex("by_nextReviewDate", "nextReviewDate", { unique: false });
        }

        // 2. Store: History (keyPath: "id")
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.HISTORY)) {
          const hStore = db.createObjectStore(INDEXED_DB_CONFIG.STORES.HISTORY, {
            keyPath: "id",
          });
          hStore.createIndex("by_questionId", "questionId", { unique: false });
          hStore.createIndex("by_timestamp", "timestamp", { unique: false });
          hStore.createIndex("by_mode", "mode", { unique: false });
        }

        // 3. Store: Sessions (keyPath: "id")
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.SESSIONS)) {
          db.createObjectStore(INDEXED_DB_CONFIG.STORES.SESSIONS, {
            keyPath: "id",
          });
        }

        // 4. Store: Settings (keyPath: "id") -> registro único id="current"
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.SETTINGS)) {
          db.createObjectStore(INDEXED_DB_CONFIG.STORES.SETTINGS, {
            keyPath: "id",
          });
        }

        // 5. Store: Goals (keyPath: "id") -> registro único id="current"
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.GOALS)) {
          db.createObjectStore(INDEXED_DB_CONFIG.STORES.GOALS, {
            keyPath: "id",
          });
        }

        // 6. Store: Metadata (keyPath: "key") -> controle de schema e migrações
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.STORES.METADATA)) {
          db.createObjectStore(INDEXED_DB_CONFIG.STORES.METADATA, {
            keyPath: "key",
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        this.dbInstance = db;
        this.dbPromise = null;

        if (db) {
          // Se a conexão for fechada externamente ou por versão superior
          db.onversionchange = () => {
            this.close();
          };
          resolve(db);
        } else {
          reject(
            this.formatError(
              "OPEN_FAILED",
              "Instância do banco retornou nula após abertura com sucesso."
            )
          );
        }
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(
          this.formatError(
            "OPEN_FAILED",
            `Falha ao abrir o IndexedDB "${INDEXED_DB_CONFIG.DB_NAME}": ${request.error?.message}`,
            undefined,
            request.error
          )
        );
      };

      request.onblocked = () => {
        blocked = true;
        this.dbPromise = null;
        reject(this.formatError('OPEN_FAILED', 'Abertura bloqueada por outra aba. Feche a aba antiga e tente novamente.'));
      };
    });

    try {
      return await this.dbPromise;
    } catch (error) {
      this.dbPromise = null;
      throw error;
    }
  }

  /**
   * Fecha a conexão atual do banco de dados (útil para testes de reabertura e upgrade).
   */
  public close(): void {
    if (this.dbInstance) {
      try {
        this.dbInstance.close();
      } catch (err) {
        console.warn("[IndexedDbStorage] Erro ao fechar DB:", err);
      }
      this.dbInstance = null;
      this.dbPromise = null;
    }
  }

  /**
   * Recupera um item único pelo ID ou chave primária.
   */
  public async get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDb();
    return new Promise<T | null>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result !== undefined ? (req.result as T) : null);
        };

        req.onerror = () => {
          reject(
            this.formatError(
              "TRANSACTION_FAILED",
              `Falha ao buscar chave "${String(key)}" em "${storeName}": ${req.error?.message}`,
              storeName,
              req.error
            )
          );
        };
      } catch (err: any) {
        reject(
          this.formatError(
            "TRANSACTION_FAILED",
            `Exceção ao criar transação para buscar em "${storeName}": ${err?.message}`,
            storeName,
            err
          )
        );
      }
    });
  }

  /**
   * Recupera todos os itens de uma object store em uma única transação rápida.
   */
  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDb();
    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result as T[]);
        };

        req.onerror = () => {
          reject(
            this.formatError(
              "TRANSACTION_FAILED",
              `Falha ao recuperar registros da store "${storeName}": ${req.error?.message}`,
              storeName,
              req.error
            )
          );
        };
      } catch (err: any) {
        reject(
          this.formatError(
            "TRANSACTION_FAILED",
            `Exceção ao ler itens da store "${storeName}": ${err?.message}`,
            storeName,
            err
          )
        );
      }
    });
  }

  /**
   * Salva ou atualiza um item em uma store (put).
   */
  private async writeTransaction(
    stores: StoreName[],
    enqueue: (tx: IDBTransaction, fail: (error: unknown) => void) => void
  ): Promise<void> {
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      let tx: IDBTransaction | undefined;
      let failure: unknown;
      const fail = (error: unknown) => {
        failure = error;
        try { tx?.abort(); } catch { /* Already aborted or finished. */ }
      };
      const detail = () => {
        const error = (failure || tx?.error) as any;
        if (error?.type && error?.message) return error;
        return this.formatError(
          error?.name === 'QuotaExceededError' ? 'QUOTA_EXCEEDED' : 'TRANSACTION_FAILED',
          error?.message || 'A transação não foi concluída.',
          stores.join(','),
          error
        );
      };
      try {
        tx = db.transaction(stores, 'readwrite');
        tx.oncomplete = () => resolve();
        // Wait for abort, so a rejected write cannot race a later transaction.
        tx.onerror = () => { failure ||= tx?.error; };
        tx.onabort = () => reject(detail());
        enqueue(tx, fail);
      } catch (error) {
        failure = error;
        if (tx) fail(error);
        else reject(detail());
      }
    });
  }

  public async put<T>(storeName: StoreName, item: T): Promise<void> {
    await this.writeTransaction([storeName], (tx) => { tx.objectStore(storeName).put(item); });
  }

  public async batchPut<T>(storeName: StoreName, items: T[]): Promise<number> {
    if (!items.length) return 0;
    await this.writeTransaction([storeName], (tx) => {
      for (const item of items) tx.objectStore(storeName).put(item);
    });
    return items.length;
  }

  public async delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    await this.writeTransaction([storeName], (tx) => { tx.objectStore(storeName).delete(key); });
  }

  public async clearStore(storeName: StoreName): Promise<void> {
    await this.writeTransaction([storeName], (tx) => { tx.objectStore(storeName).clear(); });
  }

  public async replaceQuestions(questions: Question[]): Promise<void> {
    await this.writeTransaction([INDEXED_DB_CONFIG.STORES.QUESTIONS], (tx) => {
      const store = tx.objectStore(INDEXED_DB_CONFIG.STORES.QUESTIONS);
      store.clear();
      for (const question of questions) store.put(question);
    });
  }

  public async readSnapshot(): Promise<StorageSnapshot> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const names = ['questions', 'history', 'sessions', 'settings', 'goals'];
      const tx = db.transaction(names, 'readonly');
      const records: Record<string, any[]> = {};
      tx.onabort = () => reject(this.formatError('TRANSACTION_FAILED', 'Falha ao ler snapshot.', undefined, tx.error));
      tx.onerror = () => { /* IndexedDB aborts the transaction on request failure. */ };
      tx.oncomplete = () => resolve({
        questions: records.questions, history: records.history, sessions: records.sessions,
        settings: records.settings.find((x) => x.id === 'current')?.settings ?? null,
        dailyGoal: records.goals.find((x) => x.id === 'current')?.goal ?? null,
      });
      for (const name of names) {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => { records[name] = request.result; };
      }
    });
  }

  /**
   * Migration inserts only missing records and aborts on any conflict.
   * An explicit restore replaces all five data stores. Both validate every
   * field before committing, together with the migration marker if supplied.
   */
  public async commitSnapshot(
    snapshot: StorageSnapshot,
    replace: boolean,
    metadata?: AppStorageMetadata
  ): Promise<boolean> {
    let copied = false;
    await this.writeTransaction(Object.values(INDEXED_DB_CONFIG.STORES), (tx, fail) => {
      const copy = () => {
      copied = true;
      const records: Record<string, any[]> = {
        questions: snapshot.questions, history: snapshot.history, sessions: snapshot.sessions,
        settings: snapshot.settings ? [{ id: 'current', settings: snapshot.settings }] : [],
        goals: snapshot.dailyGoal ? [{ id: 'current', goal: snapshot.dailyGoal }] : [],
      };
      const target: Record<string, any[]> = {};
      const names = Object.keys(records);
      // These reads share the write lock, including across browser tabs.
      for (const name of names) {
        const store = tx.objectStore(name);
        const request = store.getAll();
        request.onsuccess = () => {
          try {
            const existing = request.result;
            if (replace) store.clear();
            const byId = new Map(existing.map((record: any) => [record.id, record]));
            for (const item of records[name]) {
              const previous = byId.get(item.id);
              if (!replace && previous && !sameStoredValue(previous, item)) {
                throw { type: 'VALIDATION_FAILED', message: `Conflito no destino: ${name}, ID ${item.id}. Nenhum dado foi substituído.` };
              }
              store.put(item);
            }
            const check = store.getAll();
            check.onsuccess = () => {
              target[name] = check.result;
              if (Object.keys(target).length !== names.length) return;
              const actual: StorageSnapshot = {
                questions: target.questions, history: target.history, sessions: target.sessions,
                settings: target.settings.find((x) => x.id === 'current')?.settings ?? null,
                dailyGoal: target.goals.find((x) => x.id === 'current')?.goal ?? null,
              };
              const errors = snapshotDifferences(snapshot, actual);
              if (target.settings.length !== records.settings.length || target.goals.length !== records.goals.length) {
                errors.push('Registros extras de configurações ou metas no destino.');
              }
              if (errors.length) {
                fail({ type: 'VALIDATION_FAILED', message: errors.join('; ') });
              } else if (metadata) {
                const metadataStore = tx.objectStore(INDEXED_DB_CONFIG.STORES.METADATA);
                const current = metadataStore.get('app_storage_metadata');
                current.onsuccess = () => {
                  try {
                    // A concurrent migration must never overwrite a completed marker.
                    if (!replace && current.result?.value?.migrationStatus === 'COMPLETED') {
                      if (current.result.value.schemaVersion !== INDEXED_DB_CONFIG.VERSION) {
                        throw { type: 'VERSION_ERROR', message: 'Versão de migração incompatível.' };
                      }
                    } else {
                      metadataStore.put({ key: 'app_storage_metadata', value: metadata });
                    }
                  } catch (error) { fail(error); }
                };
              }
            };
          } catch (error) { fail(error); }
        };
      }
      };
      if (!replace && metadata) {
        const marker = tx.objectStore(INDEXED_DB_CONFIG.STORES.METADATA).get('app_storage_metadata');
        marker.onsuccess = () => {
          const previous = marker.result?.value;
          if (previous?.migrationStatus === 'COMPLETED') {
            if (previous.schemaVersion !== INDEXED_DB_CONFIG.VERSION || previous.validationStatus !== 'PASSED') {
              fail({ type: 'VALIDATION_FAILED', message: 'Marcador de migração incompatível.' });
            }
            // Another tab finished before this transaction acquired the write lock.
            return;
          }
          copy();
        };
      } else copy();
    });
    return copied;
  }

  /**
   * Retorna a contagem de registros em uma store (count).
   */
  public async count(storeName: StoreName): Promise<number> {
    const db = await this.getDb();
    return new Promise<number>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.count();

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          reject(
            this.formatError(
              "TRANSACTION_FAILED",
              `Falha ao contar registros de "${storeName}": ${req.error?.message}`,
              storeName,
              req.error
            )
          );
        };
      } catch (err: any) {
        reject(
          this.formatError(
            "TRANSACTION_FAILED",
            `Exceção ao contar registros de "${storeName}": ${err?.message}`,
            storeName,
            err
          )
        );
      }
    });
  }

  // =========================================================================
  // MÉTODOS DE CONVENIÊNCIA ESPECÍFICOS DO DOMÍNIO MEMORA+
  // =========================================================================

  // QUESTIONS
  public async getQuestion(id: string): Promise<Question | null> {
    return this.get<Question>(INDEXED_DB_CONFIG.STORES.QUESTIONS, id);
  }

  public async getAllQuestions(): Promise<Question[]> {
    return this.getAll<Question>(INDEXED_DB_CONFIG.STORES.QUESTIONS);
  }

  public async putQuestion(q: Question): Promise<void> {
    return this.put<Question>(INDEXED_DB_CONFIG.STORES.QUESTIONS, q);
  }

  public async putQuestionsBatch(questions: Question[]): Promise<number> {
    return this.batchPut<Question>(INDEXED_DB_CONFIG.STORES.QUESTIONS, questions);
  }

  public async deleteQuestion(id: string): Promise<void> {
    return this.delete(INDEXED_DB_CONFIG.STORES.QUESTIONS, id);
  }

  // HISTORY
  public async getAllHistory(): Promise<AnswerHistoryRecord[]> {
    return this.getAll<AnswerHistoryRecord>(INDEXED_DB_CONFIG.STORES.HISTORY);
  }

  public async putHistoryRecord(record: AnswerHistoryRecord): Promise<void> {
    return this.put<AnswerHistoryRecord>(INDEXED_DB_CONFIG.STORES.HISTORY, record);
  }

  public async putHistoryBatch(records: AnswerHistoryRecord[]): Promise<number> {
    return this.batchPut<AnswerHistoryRecord>(INDEXED_DB_CONFIG.STORES.HISTORY, records);
  }

  // SESSIONS
  public async getAllSessions(): Promise<StudySession[]> {
    return this.getAll<StudySession>(INDEXED_DB_CONFIG.STORES.SESSIONS);
  }

  public async putSession(session: StudySession): Promise<void> {
    return this.put<StudySession>(INDEXED_DB_CONFIG.STORES.SESSIONS, session);
  }

  // SETTINGS (id="current")
  public async getSettings(): Promise<UserSettings | null> {
    const item = await this.get<{ id: string; settings: UserSettings }>(
      INDEXED_DB_CONFIG.STORES.SETTINGS,
      "current"
    );
    return item ? item.settings : null;
  }

  public async putSettings(settings: UserSettings): Promise<void> {
    return this.put(INDEXED_DB_CONFIG.STORES.SETTINGS, { id: "current", settings });
  }

  // GOALS (id="current")
  public async getDailyGoal(): Promise<DailyGoalProgress | null> {
    const item = await this.get<{ id: string; goal: DailyGoalProgress }>(
      INDEXED_DB_CONFIG.STORES.GOALS,
      "current"
    );
    return item ? item.goal : null;
  }

  public async putDailyGoal(goal: DailyGoalProgress): Promise<void> {
    return this.put(INDEXED_DB_CONFIG.STORES.GOALS, { id: "current", goal });
  }

  // METADATA STORE
  public async getMetadata(key: string): Promise<any | null> {
    const item = await this.get<{ key: string; value: any }>(
      INDEXED_DB_CONFIG.STORES.METADATA,
      key
    );
    return item ? item.value : null;
  }

  public async putMetadata(key: string, value: any): Promise<void> {
    return this.put(INDEXED_DB_CONFIG.STORES.METADATA, { key, value });
  }

  public async getAppMetadata(): Promise<AppStorageMetadata | null> {
    return this.getMetadata("app_storage_metadata");
  }

  public async putAppMetadata(meta: AppStorageMetadata): Promise<void> {
    return this.putMetadata("app_storage_metadata", meta);
  }
}

// Instância singleton do adaptador IndexedDB para uso seguro pela aplicação
export const indexedDbStorage = new IndexedDbStorage();
