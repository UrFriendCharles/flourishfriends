import type { ScoreShare } from "../types";

// IndexedDB record of scores this device has shared. Best-effort only:
// share links carry their own data in the URL fragment, so a failed or
// unavailable IndexedDB (private browsing) never blocks sharing.

const DB_NAME = "ffq-shares";
const STORE = "scores";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "shareId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

export function newShareId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Persist a share locally. Non-fatal on failure. */
export async function saveScoreShare(share: ScoreShare): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(share));
  } catch {
    // storage unavailable — the URL still carries the data
  }
}

export async function getScoreShare(shareId: string): Promise<ScoreShare | null> {
  try {
    const result = await withStore<ScoreShare | undefined>("readonly", (store) =>
      store.get(shareId)
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function listScoreShares(): Promise<ScoreShare[]> {
  try {
    return await withStore<ScoreShare[]>("readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}
