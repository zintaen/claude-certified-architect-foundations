(function () {
  let e = {
    db: null,
    async init() {
      return this.db
        ? this.db
        : new Promise((e, t) => {
            let n = indexedDB.open(`CCAF_Mock`, 2);
            ((n.onupgradeneeded = (e) => {
              let t = e.target.result;
              (t.objectStoreNames.contains(`progress`) || t.createObjectStore(`progress`),
                t.objectStoreNames.contains(`sync_queue`) ||
                  t.createObjectStore(`sync_queue`, { keyPath: `offline_id` }));
            }),
              (n.onsuccess = (t) => {
                ((this.db = t.target.result), e(this.db));
              }),
              (n.onerror = () => t(n.error)));
          });
    },
    async set(e, t) {
      let n = await this.init();
      return new Promise((r, i) => {
        let a = n.transaction(`progress`, `readwrite`);
        (a.objectStore(`progress`).put(t, e),
          (a.oncomplete = () => r()),
          (a.onerror = () => i(a.error)));
      });
    },
    async delete(e) {
      let t = await this.init();
      return new Promise((n, r) => {
        let i = t.transaction(`progress`, `readwrite`);
        (i.objectStore(`progress`).delete(e),
          (i.oncomplete = () => n()),
          (i.onerror = () => r(i.error)));
      });
    },
    async get(e) {
      let t = await this.init();
      return new Promise((n, r) => {
        let i = t.transaction(`progress`, `readonly`).objectStore(`progress`).get(e);
        ((i.onsuccess = () => n(i.result)), (i.onerror = () => r(i.error)));
      });
    },
  };
  self.onmessage = async (t) => {
    let { id: n, type: r, key: i, val: a } = t.data;
    try {
      let t;
      if (r === `get`) t = await e.get(i);
      else if (r === `set`) (await e.set(i, a), (t = !0));
      else if (r === `delete`) (await e.delete(i), (t = !0));
      else if (r === `sync_add`) {
        let n = await e.init();
        (await new Promise((e, t) => {
          let r = n.transaction(`sync_queue`, `readwrite`);
          ((a.offline_id =
            a.offline_id || Date.now().toString() + `-` + Math.random().toString(36).slice(2, 7)),
            r.objectStore(`sync_queue`).put(a),
            (r.oncomplete = () => e()),
            (r.onerror = () => t(r.error)));
        }),
          (t = !0));
      } else if (r === `sync_get`) {
        let n = await e.init();
        t = await new Promise((e, t) => {
          let r = n.transaction(`sync_queue`, `readonly`),
            i = r.objectStore(`sync_queue`).getAll();
          ((i.onsuccess = () => e(i.result)), (i.onerror = () => t(r.error)));
        });
      } else if (r === `sync_remove`) {
        let n = await e.init();
        (await new Promise((e, t) => {
          let r = n.transaction(`sync_queue`, `readwrite`);
          (r.objectStore(`sync_queue`).delete(i),
            (r.oncomplete = () => e()),
            (r.onerror = () => t(r.error)));
        }),
          (t = !0));
      } else if (r === `sync_clear`) {
        let n = await e.init();
        (await new Promise((e, t) => {
          let r = n.transaction(`sync_queue`, `readwrite`);
          (r.objectStore(`sync_queue`).clear(),
            (r.oncomplete = () => e()),
            (r.onerror = () => t(r.error)));
        }),
          (t = !0));
      }
      self.postMessage({ id: n, result: t });
    } catch (e) {
      self.postMessage({ id: n, error: e instanceof Error ? e.message : String(e) });
    }
  };
})();
