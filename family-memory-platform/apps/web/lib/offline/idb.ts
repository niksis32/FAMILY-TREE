const DB_NAME = 'family-memory-offline';
const DB_VERSION = 1;

export type OutboxEntry = {
  id: string;
  type: 'person.update';
  entityId: string;
  payload: Record<string, unknown>;
  expectedVersion?: number;
  createdAt: string;
  retries: number;
  lastError?: string;
};

export type CachedPerson = {
  id: string;
  data: Record<string, unknown>;
  version?: number;
  cachedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('persons')) db.createObjectStore('persons', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tree')) db.createObjectStore('tree', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: 'outbox' | 'persons' | 'tree',
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const request = fn(objectStore);
    transaction.oncomplete = () => resolve(request ? (request as IDBRequest<T>).result : undefined);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function enqueueOutbox(entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'retries'> & { id?: string }) {
  const row: OutboxEntry = {
    id: entry.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
    ...entry,
  };
  await tx('outbox', 'readwrite', (s) => s.put(row));
  return row;
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const txReq = db.transaction('outbox', 'readonly');
    const store = txReq.objectStore('outbox');
    const all = store.getAll();
    all.onsuccess = () => resolve(all.result as OutboxEntry[]);
    all.onerror = () => reject(all.error);
  });
}

export async function removeOutbox(id: string) {
  await tx('outbox', 'readwrite', (s) => s.delete(id));
}

export async function updateOutbox(entry: OutboxEntry) {
  await tx('outbox', 'readwrite', (s) => s.put(entry));
}

export async function cachePerson(person: CachedPerson) {
  await tx('persons', 'readwrite', (s) => s.put(person));
}

export async function getCachedPerson(id: string): Promise<CachedPerson | undefined> {
  return (await tx('persons', 'readonly', (s) => s.get(id))) as CachedPerson | undefined;
}

export async function cacheTree(key: string, data: unknown) {
  await tx('tree', 'readwrite', (s) => s.put({ key, data, cachedAt: new Date().toISOString() }));
}

export async function getCachedTree(key: string): Promise<unknown | undefined> {
  const row = (await tx('tree', 'readonly', (s) => s.get(key))) as { data?: unknown } | undefined;
  return row?.data;
}
