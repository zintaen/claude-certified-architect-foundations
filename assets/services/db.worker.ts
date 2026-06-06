const idb = {
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
      const queue = (await idb.get('exam_sync_queue')) || [];
      queue.push(val);
      await idb.set('exam_sync_queue', queue);
      result = true;
    } else if (type === 'sync_get') {
      result = (await idb.get('exam_sync_queue')) || [];
    } else if (type === 'sync_clear') {
      await idb.set('exam_sync_queue', []);
      result = true;
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
