import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { dashboardFromDb } from '@/lib/cutoverFlags';

// Cross-device exam breakdowns. Reads the exam_results table (written by the grade route) so an
// identified user can reopen the full breakdown of a past sitting on any device. Two operations:
//   op 'list' -> the user's result index (metadata only) for the dashboard
//   op 'get'  -> one full breakdown by sessionId for the result page
// Reads go through the service-role client and return rows only when the supplied pin_hash matches.
//
// DATA-002: DASHBOARD_FROM_DB=on reads migrated sittings; flag off restores exam_results (no data op).

const MAX_LIST = 50;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const out = v.trim().slice(0, max);
  return out.length ? out : null;
}

async function listFromSittings(db: SupabaseClient, email: string, pinHash: string) {
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('pin_hash', pinHash)
    .maybeSingle();
  if (!user?.id) return [];
  const { data, error } = await db
    .from('sittings')
    .select('id, score_pct, passed, submitted_at, mode, breakdown')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(MAX_LIST);
  if (error || !data) return [];
  return data.map((r) => {
    const breakdown = (r.breakdown ?? {}) as Record<string, unknown>;
    const score =
      typeof breakdown.score === 'number'
        ? breakdown.score
        : Math.round(Number(r.score_pct ?? 0) * 10);
    return {
      sessionId: r.id as string,
      score,
      passed: Boolean(r.passed),
      timeSec: typeof breakdown.timeSec === 'number' ? breakdown.timeSec : 0,
      untimed: r.mode === 'practice',
      completedAt: Date.parse(r.submitted_at as string) || 0,
      source: 'sittings' as const,
    };
  });
}

async function listFromLegacy(db: SupabaseClient, email: string, pinHash: string) {
  const { data, error } = await db
    .from('exam_results')
    .select('session_id, score, passed, time_sec, untimed, completed_at')
    .eq('email', email)
    .eq('pin_hash', pinHash)
    .order('completed_at', { ascending: false })
    .limit(MAX_LIST);
  if (error || !data) return [];
  return data.map((r) => ({
    sessionId: r.session_id as string,
    score: r.score as number,
    passed: r.passed as boolean,
    timeSec: r.time_sec as number,
    untimed: r.untimed as boolean,
    completedAt: Date.parse(r.completed_at as string) || 0,
    source: 'exam_results' as const,
  }));
}

export async function POST(request: Request) {
  let op: unknown;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    op = body?.op;
    const email = clean(body?.email, 254)?.toLowerCase() ?? null;
    const pinHash = clean(body?.pinHash, 128);

    if (!email || !pinHash || !supabaseAdmin) {
      return NextResponse.json(op === 'get' ? { breakdown: null } : { results: [] });
    }
    const db = supabaseAdmin as unknown as SupabaseClient;
    const fromDb = dashboardFromDb();

    if (op === 'list') {
      const results = fromDb
        ? await listFromSittings(db, email, pinHash)
        : await listFromLegacy(db, email, pinHash);
      return NextResponse.json({ results, path: fromDb ? 'db' : 'legacy' });
    }

    if (op === 'get') {
      const sessionId = clean(body?.sessionId, 64);
      if (!sessionId) return NextResponse.json({ breakdown: null });

      if (fromDb) {
        const { data: user } = await db
          .from('users')
          .select('id')
          .eq('email', email)
          .eq('pin_hash', pinHash)
          .maybeSingle();
        if (!user?.id) return NextResponse.json({ breakdown: null, path: 'db' });
        const { data, error } = await db
          .from('sittings')
          .select('breakdown, submitted_at')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (error || !data) return NextResponse.json({ breakdown: null, path: 'db' });
        return NextResponse.json({
          breakdown: data.breakdown,
          completedAt: Date.parse(data.submitted_at as string) || 0,
          path: 'db',
        });
      }

      const { data, error } = await db
        .from('exam_results')
        .select('breakdown, completed_at')
        .eq('email', email)
        .eq('session_id', sessionId)
        .eq('pin_hash', pinHash)
        .maybeSingle();
      if (error || !data) return NextResponse.json({ breakdown: null, path: 'legacy' });
      return NextResponse.json({
        breakdown: data.breakdown,
        completedAt: Date.parse(data.completed_at as string) || 0,
        path: 'legacy',
      });
    }

    return NextResponse.json({ results: [] });
  } catch {
    return NextResponse.json(op === 'get' ? { breakdown: null } : { results: [] });
  }
}
