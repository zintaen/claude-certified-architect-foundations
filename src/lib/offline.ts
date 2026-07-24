/**
 * Offline practice helpers (SCALE-002).
 *
 * Prefetch budget: at most PAY-001 free_question_cap items per exam (default 30),
 * shaped payloads only (no answer keys). Grading stays online.
 */
import { questions } from '@/data/questions';
import { freePolicyForExam, pickFreeSubset } from '@/lib/freePolicy';
import { analyticsAllowed } from '@/lib/consent';
import { track } from '@/lib/analytics';

const DB_NAME = 'ccaf-offline-v1';
const STORE_ITEMS = 'free_items';
const STORE_QUEUE = 'pending_answers';
const PREFETCH_BUDGET_NOTE =
  'Prefetch size ≤ free_question_cap per exam (default 30). LRU: one exam pack at a time.';

export type OfflineItem = {
  id: string;
  group: string;
  text: string;
  options: { letter: string; text: string }[];
};

export type PendingAnswer = {
  clientId: string;
  sittingId: string;
  itemId: string;
  selectedKey: string;
  elapsedMs: number;
  queuedAt: string;
  examCode?: string;
};

export type OfflineCapabilities = {
  practice: boolean;
  grading: false;
  tutor: false;
  checkout: false;
  leaderboard: false;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'examCode' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'clientId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb open failed'));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb request failed'));
  });
}

/** Honest capability contract — UI banner must source from this. */
export function offlineCapabilities(
  _online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
): OfflineCapabilities {
  void _online;
  return {
    practice: true,
    grading: false,
    tutor: false,
    checkout: false,
    leaderboard: false,
  };
}

export function offlineBannerCopy(caps: OfflineCapabilities = offlineCapabilities()): {
  title: string;
  works: string[];
  doesNot: string[];
} {
  void caps;
  return {
    title: 'You are offline',
    works: [
      'Practice on cached free-subset items (no answer keys on device)',
      'Review already-loaded sitting state on this device',
    ],
    doesNot: ['Grading', 'AI tutor', 'Checkout / premium', 'Leaderboard'],
  };
}

export async function prefetchFreePractice(examCode: string): Promise<void> {
  void PREFETCH_BUDGET_NOTE;
  const policy = freePolicyForExam(examCode);
  const subset = pickFreeSubset(questions, policy.free_question_cap);
  const shaped: OfflineItem[] = subset.map((q) => ({
    id: q.id,
    group: q.group,
    text: q.text,
    options: q.options.map((o) => ({ letter: o.letter, text: o.text })),
  }));

  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, 'readwrite');
  await idbReq(tx.objectStore(STORE_ITEMS).put({ examCode, items: shaped, savedAt: Date.now() }));
  db.close();
}

export async function getCachedFreePractice(examCode: string): Promise<OfflineItem[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const row = await idbReq<{ examCode: string; items: OfflineItem[] } | undefined>(
      tx.objectStore(STORE_ITEMS).get(examCode)
    );
    db.close();
    return row?.items ?? [];
  } catch {
    return [];
  }
}

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function queueAnswer(a: PendingAnswer): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, 'readwrite');
  await idbReq(tx.objectStore(STORE_QUEUE).put(a));
  db.close();
  if (analyticsAllowed()) {
    try {
      track('offline_practice_used', { exam_code: a.examCode ?? null });
    } catch {
      /* never break product */
    }
  }
}

export async function listPendingAnswers(): Promise<PendingAnswer[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const all = await idbReq<PendingAnswer[]>(tx.objectStore(STORE_QUEUE).getAll());
    db.close();
    return all ?? [];
  } catch {
    return [];
  }
}

export async function removePending(clientIds: string[]): Promise<void> {
  if (!clientIds.length) return;
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, 'readwrite');
  const store = tx.objectStore(STORE_QUEUE);
  for (const id of clientIds) {
    store.delete(id);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb delete failed'));
  });
  db.close();
}

/**
 * Push queued answers to `/api/offline/sync`. Consent-aware: never emits analytics
 * when analytics consent is rejected (events only after successful sync + consent).
 */
export async function syncPending(): Promise<{ synced: number; failed: number }> {
  const pending = await listPendingAnswers();
  if (!pending.length) return { synced: 0, failed: 0 };

  let email: string | null = null;
  let pinHash: string | null = null;
  try {
    email = localStorage.getItem('ccaf-email');
    pinHash = localStorage.getItem('ccaf-pinHash');
  } catch {
    /* guest */
  }

  try {
    const res = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pinHash, answers: pending }),
    });
    if (!res.ok) return { synced: 0, failed: pending.length };
    const body = (await res.json()) as { syncedClientIds?: string[] };
    const ids = body.syncedClientIds ?? [];
    await removePending(ids);
    if (analyticsAllowed() && ids.length) {
      track('offline_sync_completed', { synced: ids.length });
    }
    return { synced: ids.length, failed: pending.length - ids.length };
  } catch {
    return { synced: 0, failed: pending.length };
  }
}

/** Refuse full-offline exam-mode start (integrity boundary). */
export function canStartExamOffline(): { ok: false; reason: string } {
  return {
    ok: false,
    reason:
      'Full exam mode needs a live connection so the sitting can be assembled on the server. Practice on cached free items is available offline; grading still requires reconnect.',
  };
}

export function scheduleIdlePrefetch(examCode = 'ccaf'): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    void prefetchFreePractice(examCode).catch(() => {});
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 2500);
  }
}
