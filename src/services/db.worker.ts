const idb = {
  db: null as IDBDatabase | null,

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('CCAF_Mock', 2);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress');
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'offline_id' });
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
  },
};

self.onmessage = async (e: MessageEvent) => {
  const { id, type, key, val } = e.data;

  try {
    let result;
    if (type === 'get') {
      result = await idb.get(key);
    } else if (type === 'set') {
      await idb.set(key, val);
      result = true;
    } else if (type === 'delete') {
      await idb.delete(key);
      result = true;
    } else if (type === 'sync_add') {
      const db = await idb.init();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        val.offline_id =
          val.offline_id || Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);
        tx.objectStore('sync_queue').put(val);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      result = true;
    } else if (type === 'sync_get') {
      const db = await idb.init();
      result = await new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const req = tx.objectStore('sync_queue').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(tx.error);
      });
    } else if (type === 'sync_remove') {
      const db = await idb.init();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      result = true;
    } else if (type === 'sync_clear') {
      const db = await idb.init();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      result = true;
    }

    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
