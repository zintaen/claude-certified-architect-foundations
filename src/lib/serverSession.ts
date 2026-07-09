import { useExamStore } from '@/store/examStore';
import { questions } from '@/data/questions';

// Cross-device resume: a small, throttled checkpoint of the in-progress sitting saved server-side
// for identified users (email + PIN). localStorage stays the primary, works-offline path; this only
// adds "start on one device, resume on another". The snapshot is minimal (question ids + chosen
// letters + position + timer); the questions themselves are rebuilt from the public bundle on
// restore, and the answer key never leaves the server.

export interface SavedSession {
  ids: string[];
  answers: Record<string, string>;
  idx: number;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  untimed: boolean;
  sessionId: string;
}

function identity(): { email: string; pinHash: string } | null {
  if (typeof window === 'undefined') return null;
  const email = localStorage.getItem('ccaf-email');
  const pinHash = localStorage.getItem('ccaf-pinHash');
  return email && pinHash ? { email, pinHash } : null;
}

// True when the user set an email + PIN, i.e. has an identity to key a server checkpoint to.
export function isIdentified(): boolean {
  return identity() !== null;
}

// Build a snapshot of the current sitting, or null when there is nothing worth saving.
function buildPayload(): SavedSession | null {
  const s = useExamStore.getState();
  if (s.items.length === 0 || s.finished || s.isFlashcardMode) return null;
  return {
    ids: s.items.map((i) => i.id),
    answers: Object.fromEntries(
      s.items.filter((i) => i.chosenLetter).map((i) => [i.id, i.chosenLetter as string])
    ),
    idx: s.idx,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    durationSec: s.durationSec,
    untimed: s.untimed,
    sessionId: s.sessionId,
  };
}

export async function saveServerSession(): Promise<void> {
  const id = identity();
  const state = buildPayload();
  if (!id || !state) return;
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'save', ...id, state }),
    });
  } catch {
    /* best-effort; localStorage already holds the session */
  }
}

// A final checkpoint on tab close, using sendBeacon so it survives the page unloading.
export function beaconSaveServerSession(): void {
  const id = identity();
  const state = buildPayload();
  if (!id || !state || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  try {
    const blob = new Blob([JSON.stringify({ op: 'save', ...id, state })], {
      type: 'application/json',
    });
    navigator.sendBeacon('/api/session', blob);
  } catch {
    /* ignore */
  }
}

export async function clearServerSession(): Promise<void> {
  const id = identity();
  if (!id) return;
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'clear', ...id }),
    });
  } catch {
    /* ignore */
  }
}

export async function loadServerSession(): Promise<SavedSession | null> {
  const id = identity();
  if (!id) return null;
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'load', ...id }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: SavedSession | null };
    return data && data.state ? data.state : null;
  } catch {
    return null;
  }
}

// Rebuild the store from a saved server snapshot (used when restoring on a new device). Questions are
// looked up from the public bundle in their authored option order, so letters stay consistent.
export function restoreServerSession(saved: SavedSession): boolean {
  const items = saved.ids
    .map((id) => {
      const q = questions.find((x) => x.id === id);
      if (!q) return null;
      return {
        id: q.id,
        group: q.group,
        text: q.text,
        options: [...q.options],
        chosenLetter: saved.answers[id] ?? null,
        flagged: false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (items.length === 0) return false;
  useExamStore.setState({
    items,
    idx: Math.min(Math.max(0, saved.idx), items.length - 1),
    startedAt: saved.startedAt,
    endsAt: saved.endsAt,
    durationSec: saved.durationSec,
    untimed: saved.untimed,
    isFlashcardMode: false,
    sessionId: saved.sessionId,
    finished: false,
    timedOut: false,
    result: null,
  });
  return true;
}
