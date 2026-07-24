import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';
import { computeReadiness } from '@/lib/readiness';

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
 * GET /api/readiness?exam=ccaf&email=&pinHash=
 * Premium-gated when ENTITLEMENTS_ENFORCED=on.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/readiness', 'GET'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

  const url = new URL(request.url);
  const exam = url.searchParams.get('exam')?.trim().toLowerCase() || 'ccaf';
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';
  const userId = await resolveUser(email, pinHash);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (enforcementOn()) {
    const access = await resolveAccess(userId, exam);
    if (access.tier !== 'premium') {
      return NextResponse.json(
        {
          error: 'premium_required',
          upgrade: { reason: 'readiness_analytics', exam_code: exam },
        },
        { status: 403 }
      );
    }
  }

  const readiness = await computeReadiness(userId, email, exam);
  // Never return raw response rows
  return NextResponse.json(readiness);
}
