import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Cross-device exam breakdowns. Reads the exam_results table (written by the grade route) so an
// identified user can reopen the full breakdown of a past sitting on any device. Two operations:
//   op 'list' -> the user's result index (metadata only) for the dashboard
//   op 'get'  -> one full breakdown by sessionId for the result page
// Reads go through the service-role client and return rows only when the supplied pin_hash matches,
// the same trusted-read pattern as the resume checkpoint. Fails soft (empty list / null) for guests
// and when the service key is not configured, so the client stays a no-op rather than erroring.

const MAX_LIST = 50;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const out = v.trim().slice(0, max);
  return out.length ? out : null;
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

    if (op === 'list') {
      const { data, error } = await db
        .from('exam_results')
        .select('session_id, score, passed, time_sec, untimed, completed_at')
        .eq('email', email)
        .eq('pin_hash', pinHash)
        .order('completed_at', { ascending: false })
        .limit(MAX_LIST);
      if (error || !data) return NextResponse.json({ results: [] });
      const results = data.map((r) => ({
        sessionId: r.session_id as string,
        score: r.score as number,
        passed: r.passed as boolean,
        timeSec: r.time_sec as number,
        untimed: r.untimed as boolean,
        completedAt: Date.parse(r.completed_at as string) || 0,
      }));
      return NextResponse.json({ results });
    }

    if (op === 'get') {
      const sessionId = clean(body?.sessionId, 64);
      if (!sessionId) return NextResponse.json({ breakdown: null });
      const { data, error } = await db
        .from('exam_results')
        .select('breakdown, completed_at')
        .eq('email', email)
        .eq('session_id', sessionId)
        .eq('pin_hash', pinHash)
        .maybeSingle();
      if (error || !data) return NextResponse.json({ breakdown: null });
      return NextResponse.json({
        breakdown: data.breakdown,
        completedAt: Date.parse(data.completed_at as string) || 0,
      });
    }

    return NextResponse.json({ results: [] });
  } catch {
    // Never surface an error: reopening a breakdown is best-effort on top of the local archive.
    return NextResponse.json(op === 'get' ? { breakdown: null } : { results: [] });
  }
}
