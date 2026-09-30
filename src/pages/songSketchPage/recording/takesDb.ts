import { Take, TakePatch } from './takes';

// 녹음 테이크(오디오 Blob) 저장소. localStorage에는 곡만 두고 오디오는 IndexedDB에 둔다.

const DB_NAME = 'fretflow-song-takes';
const DB_VERSION = 1;
const STORE = 'takes';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new DOMException('IndexedDB unavailable', 'InvalidStateError'),
    );
  }
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('songId', 'songId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new DOMException('IndexedDB blocked', 'InvalidStateError'));
  }).catch((error) => {
    dbPromise = null; // 다음 호출에서 다시 시도
    throw error;
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        transaction.oncomplete = () => resolve(request?.result);
        // 용량 초과(QuotaExceededError)는 트랜잭션 오류로 올라온다.
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

export async function listTakes(songId: string): Promise<Take[]> {
  const takes = await run<Take[]>('readonly', (store) =>
    store.index('songId').getAll(songId),
  );
  return takes ?? [];
}

export async function saveTake(take: Take): Promise<void> {
  await run('readwrite', (store) => store.put(take));
}

export async function updateTake(id: string, patch: TakePatch) {
  await run('readwrite', (store) => {
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...patch });
    };
  });
}

export async function deleteTake(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
}

export async function deleteTakesForSong(songId: string): Promise<void> {
  await run('readwrite', (store) => {
    const request = store
      .index('songId')
      .openKeyCursor(IDBKeyRange.only(songId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}

/** 저장소 사용량. 지원하지 않으면 null. */
export async function storageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
