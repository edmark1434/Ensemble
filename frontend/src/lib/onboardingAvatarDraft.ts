const DATABASE_NAME = 'ensemble-onboarding';
const STORE_NAME = 'avatar-drafts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export const saveAvatarDraft = (draftId: string, file: File) => transact('readwrite', (store) => store.put(file, draftId));
export const getAvatarDraft = (draftId: string) => transact<File | undefined>('readonly', (store) => store.get(draftId));
export const deleteAvatarDraft = (draftId: string) => transact('readwrite', (store) => store.delete(draftId));
