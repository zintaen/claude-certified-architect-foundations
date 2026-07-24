import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import {
  bindReferral,
  codeFor,
  hashReferralCode,
  isDisposableEmail,
  onActivation,
  referralStats,
  shareUrl,
} from '@/lib/referrals';

async function resolveUser(email: string, pinHash: string) {
  if (!supabaseAdmin || !email || !pinHash) return null;
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('pin_hash', pinHash)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * GET ?email=&pinHash= → code + stats
 * POST { op: 'bind'|'activate', ... }
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/referrals', 'GET'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';
  const userId = await resolveUser(email, pinHash);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const stats = await referralStats(userId);
    return NextResponse.json({
      ...stats,
      codeHash: hashReferralCode(stats.code),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unavailable' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/referrals', 'POST'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const op = body.op;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const pinHash = typeof body.pinHash === 'string' ? body.pinHash.trim() : '';

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: 'disposable_email' }, { status: 400 });
  }

  const userId = await resolveUser(email, pinHash);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (op === 'ensure_code') {
    const code = await codeFor(userId);
    return NextResponse.json({ code, shareUrl: shareUrl(code), codeHash: hashReferralCode(code) });
  }

  if (op === 'bind') {
    const code = typeof body.code === 'string' ? body.code : '';
    const result = await bindReferral(code, userId);
    return NextResponse.json({
      result,
      codeHash: result === 'bound' ? hashReferralCode(code) : undefined,
    });
  }

  if (op === 'activate') {
    const ip = clientIpFromHeaders(request.headers);
    const out = await onActivation(userId, { velocityKey: ip });
    return NextResponse.json({ ok: true, ...out });
  }

  return NextResponse.json({ error: 'unknown_op' }, { status: 400 });
}
