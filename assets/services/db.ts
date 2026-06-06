import { State } from '../core/store';

export const idb = {
  db: null as IDBDatabase | null,
  
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('CCAF_Mock', 1);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress');
        }
      };
      req.onsuccess = (e: Event) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  
  async set(key: string, val: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('progress', 'readwrite');
      tx.objectStore('progress').put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  
  async delete(key: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('progress', 'readwrite');
      tx.objectStore('progress').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async get(key: string): Promise<any> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('progress', 'readonly');
      const req = tx.objectStore('progress').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
};

export const syncQueue = {
  async add(payload: any) {
    const queue = (await idb.get('exam_sync_queue')) || [];
    queue.push(payload);
    await idb.set('exam_sync_queue', queue);
  },
  async get() {
    return (await idb.get('exam_sync_queue')) || [];
  },
  async clear() {
    await idb.set('exam_sync_queue', []);
  }
};

export async function saveProgress(state: State): Promise<void> {
  if (state.finished || state.items.length === 0) {
    await idb.delete('exam_state').catch(console.error);
    return;
  }
  const safeState = { ...state, timerHandle: null };
  await idb.set('exam_state', safeState).catch(console.error);
}
