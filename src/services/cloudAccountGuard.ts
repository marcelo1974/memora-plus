import { indexedDbStorage, INDEXED_DB_CONFIG } from './indexedDbStorage';

export const CLOUD_OWNER_KEY = 'cloud_account_owner_v1';

export async function getCloudOwner(): Promise<string | null> {
  const value = await indexedDbStorage.getMetadata(CLOUD_OWNER_KEY);
  if (value === null) return null;
  if (typeof value !== 'string' || !value) throw new Error('Identificação da conta local inválida. Sincronização bloqueada.');
  return value;
}

// Compare-and-set under one IDB write lock: concurrent tabs cannot claim different owners.
export async function claimCloudOwner(uid: string): Promise<void> {
  if (!uid) throw new Error('Conta inválida.');
  const db = await indexedDbStorage.getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_CONFIG.STORES.METADATA, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_CONFIG.STORES.METADATA);
    let failure: Error | null = null;
    const read = store.get(CLOUD_OWNER_KEY);
    read.onsuccess = () => {
      const previous = read.result;
      if (previous && previous.value !== uid) {
        failure = new Error('Estes dados locais estão vinculados a outra conta. Entre na conta original.');
        tx.abort(); return;
      }
      store.put({ key: CLOUD_OWNER_KEY, value: uid });
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('Não foi possível vincular a conta.'));
    tx.onerror = () => reject(tx.error ?? new Error('Não foi possível vincular a conta.'));
  });
}

export async function assertCloudAccount(uid: string, currentUid: () => string | null): Promise<void> {
  if (!uid || currentUid() !== uid) throw new Error('A conta mudou. Sincronização interrompida.');
  const owner = await getCloudOwner();
  if (currentUid() !== uid) throw new Error('A conta mudou. Sincronização interrompida.');
  if (owner !== uid) throw new Error(owner ? 'Dados vinculados a outra conta. Entre na conta original.' : 'Vincule os dados à sua conta usando Sincronizar Agora.');
}
