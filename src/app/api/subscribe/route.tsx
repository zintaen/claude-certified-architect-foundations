import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Records a marketing opt-in. The subscribers table is written only by the server (service-role
// key), the same trusted-write pattern as the leaderboard. See supabase/subscribers.sql.
function cleanEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase().slice(0, 254);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = cleanEmail(body?.email);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
    }
    if (!supabaseAdmin) {
      // Not configured yet (no service-role key); fail soft so the UX is unaffected.
      return NextResponse.json({ ok: false, error: 'not configured' });
    }
    const source =
      typeof body?.source === 'string' ? body.source.replace(/[^\w \-]/g, '').slice(0, 40) : 'site';
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { error } = await db
      .from('subscribers')
      .upsert({ email, source }, { onConflict: 'email' });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  }
}
