import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Cross-device resume checkpoint store. Holds a small snapshot of an in-progress sitting for
// identified users (email + PIN), so they can resume on another device. The answer key is never
// stored here - only question ids, the letters chosen, the position, and the timer. Writes go
// through the service-role client, the same trusted-write pattern as the leaderboard.

const MAX_STATE_BYTES = 200_000; // a session snapshot is a few KB; this is a generous abuse cap.

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const out = v.trim().slice(0, max);
  return out.length ? out : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const op = body?.op;
    const email = clean(body?.email, 254)?.toLowerCase() ?? null;
    const pinHash = clean(body?.pinHash, 128);

    // Needs an identity and the service-role client. Fail soft otherwise so the client autosave is a
    // no-op rather than an error (guests, and environments without the service key).
    if (!email || !pinHash || !supabaseAdmin) {
      return NextResponse.json(op === 'load' ? { state: null } : { ok: false });
    }
    const db = supabaseAdmin as unknown as SupabaseClient;

    if (op === 'save') {
      const state = body?.state;
      if (!state || typeof state !== 'object') return NextResponse.json({ ok: false });
      if (JSON.stringify(state).length > MAX_STATE_BYTES) return NextResponse.json({ ok: false });
      const { error } = await db
        .from('active_exam_sessions')
        .upsert(
          { email, pin_hash: pinHash, state, updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
      return NextResponse.json({ ok: !error });
    }

    if (op === 'load') {
      const { data, error } = await db
        .from('active_exam_sessions')
        .select('state, pin_hash')
        .eq('email', email)
        .maybeSingle();
      // Only return the snapshot when the PIN matches the one that saved it.
      if (error || !data || data.pin_hash !== pinHash) return NextResponse.json({ state: null });
      return NextResponse.json({ state: data.state });
    }

    if (op === 'clear') {
      await db.from('active_exam_sessions').delete().eq('email', email).eq('pin_hash', pinHash);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false });
  } catch {
    // Never surface an error to the client: resume is best-effort on top of local storage.
    return NextResponse.json({ ok: false });
  }
}
