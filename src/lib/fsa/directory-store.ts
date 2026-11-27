import type { ReadableDirectoryHandle } from "./directory-access";

const DATABASE = "ed-sitaware";
const STORE = "handles";
const JOURNAL_DIRECTORY = "journal-directory";

function databaseAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

async function withStore<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(STORE, "readwrite").objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Local storage request failed."));
    });
  } finally {
    database.close();
  }
}

/**
 * Remember the folder the player chose so they need not pick it again on every visit.
 * Browsers keep a handle in IndexedDB; whether access survives a restart is then up to
 * the browser's own permission prompt.
 */
export async function saveDirectoryHandle(handle: ReadableDirectoryHandle): Promise<void> {
  if (!databaseAvailable()) {
    return;
  }
  await withStore((store) => store.put(handle, JOURNAL_DIRECTORY));
}

export async function loadDirectoryHandle(): Promise<ReadableDirectoryHandle | null> {
  if (!databaseAvailable()) {
    return null;
  }
  const stored = await withStore<unknown>((store) => store.get(JOURNAL_DIRECTORY));
  return stored && typeof stored === "object" ? (stored as ReadableDirectoryHandle) : null;
}

export async function clearDirectoryHandle(): Promise<void> {
  if (!databaseAvailable()) {
    return;
  }
  await withStore((store) => store.delete(JOURNAL_DIRECTORY));
}
