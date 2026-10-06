import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { indexedDbStorage } from '../src/services/indexedDbStorage';
import { claimCloudOwner, getCloudOwner, assertCloudAccount, CLOUD_OWNER_KEY } from '../src/services/cloudAccountGuard';

beforeEach(() => {
  indexedDbStorage.close();
  const factory = new IDBFactory();
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: factory });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { indexedDB: factory } });
});

test('unowned data cannot sync before explicit binding', async () => {
  assert.equal(await getCloudOwner(), null);
  await assert.rejects(assertCloudAccount('A', () => 'A'), /Vincule/);
  assert.equal(await getCloudOwner(), null);
});

test('binding survives reconnect; logout and another UID are blocked', async () => {
  await claimCloudOwner('A');
  indexedDbStorage.close();
  await assertCloudAccount('A', () => 'A');
  await assert.rejects(assertCloudAccount('A', () => null), /conta mudou/);
  await assert.rejects(assertCloudAccount('B', () => 'B'), /outra conta/);
  await assert.rejects(claimCloudOwner('B'), /outra conta/);
  assert.equal(await getCloudOwner(), 'A');
});

test('two concurrent claims cannot replace the owner', async () => {
  const result = await Promise.allSettled([claimCloudOwner('A'), claimCloudOwner('B')]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(result.filter((r) => r.status === 'rejected').length, 1);
  assert.ok(['A', 'B'].includes((await getCloudOwner())!));
});

test('account change during owner lookup stops authorization', async () => {
  await claimCloudOwner('A');
  let calls = 0;
  await assert.rejects(assertCloudAccount('A', () => ++calls === 1 ? 'A' : 'B'), /conta mudou/);
});

test('corrupt owner fails closed without claiming it', async () => {
  await indexedDbStorage.putMetadata(CLOUD_OWNER_KEY, { bad: true });
  await assert.rejects(getCloudOwner(), /inválida/);
  await assert.rejects(claimCloudOwner('A'), /outra conta/);
});

test('same owner binding is repeatable; ownership does not modify questions', async () => {
  await claimCloudOwner('A'); await claimCloudOwner('A');
  assert.equal(await getCloudOwner(), 'A');
  assert.equal((await indexedDbStorage.getAllQuestions()).length, 0);
});

test('binding transaction abort preserves an unowned bank', async () => {
  const db = await indexedDbStorage.getDb();
  const transaction = db.transaction.bind(db);
  db.transaction = ((...args: Parameters<typeof db.transaction>) => {
    const tx = transaction(...args);
    const store = tx.objectStore('metadata');
    const put = store.put.bind(store);
    store.put = ((...values: Parameters<typeof store.put>) => {
      const result = put(...values);
      tx.abort();
      return result;
    }) as typeof store.put;
    const objectStore = tx.objectStore.bind(tx);
    tx.objectStore = ((name: string) => name === 'metadata' ? store : objectStore(name)) as typeof tx.objectStore;
    return tx;
  }) as typeof db.transaction;
  try { await assert.rejects(claimCloudOwner('A')); }
  finally { db.transaction = transaction; }
  assert.equal(await getCloudOwner(), null);
});
