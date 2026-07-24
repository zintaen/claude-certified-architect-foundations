import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';
import { DRILL_CONFIG, planDrill } from '@/lib/adaptive';

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
 * POST { exam, length, email, pinHash, seed? } → DrillPlan
 * Premium when ENTITLEMENTS_ENFORCED=on.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/drill/plan', 'POST'),
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

  const exam = typeof body.exam === 'string' ? body.exam.trim().toLowerCase() : 'ccaf';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const pinHash = typeof body.pinHash === 'string' ? body.pinHash.trim() : '';
  const length = typeof body.length === 'number' ? body.length : DRILL_CONFIG.lengths[1]!;
  const seed = typeof body.seed === 'string' ? body.seed : undefined;

  const userId = await resolveUser(email, pinHash);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (enforcementOn()) {
    const access = await resolveAccess(userId, exam);
    if (access.tier !== 'premium') {
      return NextResponse.json(
        { error: 'premium_required', upgrade: { reason: 'adaptive_drill', exam_code: exam } },
        { status: 403 }
      );
    }
  }

  const plan = await planDrill({ userId, email, examCode: exam, length, seed });
  return NextResponse.json({ ...plan, variant: 'drill', mode: 'practice' });
}
