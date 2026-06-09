// Very simple offline queue implementation using IndexedDB via idb-keyval
// Since we didn't install idb-keyval, we can use localStorage for now
// to avoid extra dependencies, or just a simple array if we're not fully offline.
// In a true robust PWA, we'd use IndexedDB.

import type { Database } from '../core/database.types';

type SubmitExamArgs = Database['public']['Functions']['submit_exam_result']['Args'];

export const syncQueue = {
  async add(payload: SubmitExamArgs) {
    if (typeof window === 'undefined') return;
    const queue = JSON.parse(localStorage.getItem('ccaf-sync-queue') || '[]');
    queue.push(payload);
    localStorage.setItem('ccaf-sync-queue', JSON.stringify(queue));
  },
  async sync(
    supabaseRpc: (
      name: 'submit_exam_result',
      payload: SubmitExamArgs
    ) => Promise<{ error: unknown }>
  ) {
    if (typeof window === 'undefined') return;
    const queue = JSON.parse(localStorage.getItem('ccaf-sync-queue') || '[]');
    if (queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        const { error } = await supabaseRpc('submit_exam_result', item);
        if (error) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem('ccaf-sync-queue', JSON.stringify(remaining));
  },
};
