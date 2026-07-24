import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';
import { assemblePlan } from '@/lib/studyPlan';
import { weakDomains } from '@/lib/readiness';

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

export async function GET(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/plan', 'GET'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';
  const exam = url.searchParams.get('exam')?.trim().toLowerCase() || 'ccaf';
  const userId = await resolveUser(email, pinHash);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (enforcementOn()) {
    const access = await resolveAccess(userId, exam);
    if (access.tier !== 'premium') {
      return NextResponse.json({ error: 'premium_required' }, { status: 403 });
    }
  }

  if (!supabaseAdmin) return NextResponse.json({ plan: null });
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data } = await db
    .from('study_plans')
    .select('id, plan, inputs, created_at')
    .eq('user_id', userId)
    .eq('exam_code', exam)
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ plan: data?.plan ?? null, inputs: data?.inputs ?? null });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/plan', 'POST'),
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
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const pinHash = typeof body.pinHash === 'string' ? body.pinHash.trim() : '';
  const examCode = typeof body.examCode === 'string' ? body.examCode : 'ccaf';
  const examDate = typeof body.examDate === 'string' ? body.examDate : '';
  const hoursPerWeek = typeof body.hoursPerWeek === 'number' ? body.hoursPerWeek : 6;
  const userId = await resolveUser(email, pinHash);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let tier: 'free' | 'premium' = 'premium';
  if (enforcementOn()) {
    const access = await resolveAccess(userId, examCode);
    if (access.tier !== 'premium') {
      return NextResponse.json({ error: 'premium_required' }, { status: 403 });
    }
    tier = access.tier;
  }

  const deficits = await weakDomains(userId, examCode, email);
  const plan = assemblePlan(
    { examCode, examDate, hoursPerWeek, tier },
    deficits.map((d) => ({ domainKey: d.domainKey, deficit: d.deficit }))
  );

  if (supabaseAdmin) {
    const db = supabaseAdmin as unknown as SupabaseClient;
    await db
      .from('study_plans')
      .update({ superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('exam_code', examCode)
      .is('superseded_at', null);
    await db.from('study_plans').insert({
      user_id: userId,
      exam_code: examCode,
      inputs: { examDate, hoursPerWeek, tier },
      plan,
      plan_version: 1,
    });
  }

  return NextResponse.json({ plan, replan: body.replan === true });
}
