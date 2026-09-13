import { pendingCompletionSchema as entrySchema } from '@tobi/contracts';
import type { PendingCompletion } from '@tobi/contracts';

/** Bounded, per-account durable completion commands. Contains no passwords or session tokens. */
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('tobi-progress', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('completions', { keyPath: 'runId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Lokaler Speicher ist nicht verfügbar.'));
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('completions', mode);
      let result: T;
      const request = action(tx.objectStore('completions'));
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(new Error('Lokales Speichern ist fehlgeschlagen.'));
    });
  } finally {
    db.close();
  }
}
export async function pendingCompletions(userId: string): Promise<PendingCompletion[]> {
  const entries: unknown[] = await transaction('readonly', (store) => store.getAll());
  return entries.flatMap((entry) => {
    const parsed = entrySchema.safeParse(entry);
    return parsed.success && parsed.data.userId === userId ? [parsed.data] : [];
  });
}
export async function enqueueCompletion(entry: PendingCompletion): Promise<void> {
  const parsed = entrySchema.parse(entry);
  const count = await transaction('readonly', (store) => store.count());
  if (count >= 50)
    throw new Error('Lokaler Speicher voll. Bitte zuerst offene Ergebnisse synchronisieren.');
  await transaction('readwrite', (store) => store.put(parsed));
}
export async function removeCompletion(runId: string): Promise<void> {
  await transaction('readwrite', (store) => store.delete(runId));
}
