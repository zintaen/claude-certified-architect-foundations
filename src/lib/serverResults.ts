import { getIdentity } from './serverSession';
import type { GradedResult } from '@/store/examStore';

// Cross-device exam breakdowns. For identified users (email + PIN), the grade route stores each
// finished sitting's full breakdown server-side; these helpers list them for the dashboard and
// fetch one for the result page, so a breakdown opens on any device. The device-local archive in
// the store stays the primary, works-offline path; the server is the fallback for other devices.

export interface ServerResultMeta {
  sessionId: string;
  score: number;
  passed: boolean;
  timeSec: number;
  untimed: boolean;
  completedAt: number;
}

// The user's result index (metadata only), newest first. Empty for guests or on any error.
export async function listServerResults(): Promise<ServerResultMeta[]> {
  const id = getIdentity();
  if (!id) return [];
  try {
    const res = await fetch('/api/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'list', ...id }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ServerResultMeta[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

// One stored breakdown by sessionId, or null when it is not on the server or the PIN does not match.
export async function getServerResult(
  sessionId: string
): Promise<{ breakdown: GradedResult; completedAt: number } | null> {
  const id = getIdentity();
  if (!id) return null;
  try {
    const res = await fetch('/api/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'get', ...id, sessionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { breakdown?: GradedResult | null; completedAt?: number };
    return data && data.breakdown
      ? { breakdown: data.breakdown, completedAt: data.completedAt ?? 0 }
      : null;
  } catch {
    return null;
  }
}
