import { State } from '../core/store';

const worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });

let msgId = 0;
const pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

worker.onmessage = (e) => {
  const { id, result, error } = e.data;
  const p = pending.get(id);
  if (p) {
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  }
};

function sendMsg(type: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Worker timeout: ${type} (id=${id})`));
    }, 10_000);
    pending.set(id, {
      resolve: (val: unknown) => {
        clearTimeout(timer);
        resolve(val);
      },
      reject: (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    });
    worker.postMessage({ id, type, ...payload });
  });
}

export const idb = {
  get: (key: string) => sendMsg('get', { key }),
  set: (key: string, val: any) => sendMsg('set', { key, val }),
  delete: (key: string) => sendMsg('delete', { key }),
};

export const syncQueue = {
  add: (payload: any) => sendMsg('sync_add', { val: payload }),
  get: () => sendMsg('sync_get'),
  remove: (key: string) => sendMsg('sync_remove', { key }),
  clear: () => sendMsg('sync_clear'),
};

export async function saveProgress(state: State): Promise<void> {
  if (state.finished || state.items.length === 0) {
    await idb.delete('exam_state').catch(console.error);
    return;
  }
  const safeState = { ...state, timerHandle: null };
  await idb.set('exam_state', safeState).catch(console.error);
}
