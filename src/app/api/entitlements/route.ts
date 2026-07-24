import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';

/**
 * Display-only entitlement summary (PAY-001). Never used for enforcement —
 * serving paths resolve access server-side.
 */
export async function GET(request: Request) {
  const cls = classify('/api/entitlements', 'GET');
  const limited = await enforceRateLimit(cls, clientIpFromHeaders(request.headers));
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error, retryAfterS: limited.retryAfterS },
      {
        status: limited.status,
        headers: limited.retryAfterS ? { 'Retry-After': String(limited.retryAfterS) } : undefined,
      }
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';
  const examCode = url.searchParams.get('examCode')?.trim() || 'ccaf';

  if (!email || !pinHash || !supabaseAdmin) {
    return NextResponse.json({
      tier: 'free',
      grants: [],
      enforcement: enforcementOn() ? 'on' : 'off',
    });
  }

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('pin_hash', pinHash)
    .maybeSingle();

  const access = await resolveAccess(user?.id ?? null, examCode);
  return NextResponse.json({
    tier: access.tier,
    grants: access.grants,
    enforcement: enforcementOn() ? 'on' : 'off',
  });
}
