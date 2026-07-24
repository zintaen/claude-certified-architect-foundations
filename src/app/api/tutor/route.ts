import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  classify,
  clientIpFromHeaders,
  enforceRateLimit,
  hitTutorSubBudget,
} from '@/lib/rateLimit';
import { askTutor, isTutorIntent, tutorEnabled } from '@/lib/tutor';
import { resolveAccess, enforcementOn } from '@/lib/entitlements';

/**
 * POST /api/tutor — premium tutor ladder (AI-001).
 * Kill switch TUTOR_ENABLED=off → degraded. Free tier refused when enforcement on.
 */
export async function POST(request: Request) {
  const cls = classify('/api/tutor', 'POST');
  const ip = clientIpFromHeaders(request.headers);
  const limited = await enforceRateLimit(cls, ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error, retryAfterS: limited.retryAfterS },
      {
        status: limited.status,
        headers: limited.retryAfterS ? { 'Retry-After': String(limited.retryAfterS) } : undefined,
      }
    );
  }

  const sub = await hitTutorSubBudget(ip);
  if (!sub.allowed) {
    return NextResponse.json(
      { error: 'tutor_rate_limited', retryAfterS: sub.retryAfterS },
      {
        status: 429,
        headers: { 'Retry-After': String(sub.retryAfterS) },
      }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const pinHash = typeof body.pinHash === 'string' ? body.pinHash.trim().slice(0, 128) : '';
  const sittingId = typeof body.sittingId === 'string' ? body.sittingId.slice(0, 64) : '';
  const itemId = typeof body.itemId === 'string' ? body.itemId.slice(0, 64) : '';
  const intent = typeof body.intent === 'string' ? body.intent : '';
  const phase = body.phase === 'pre_grade' ? 'pre_grade' : 'post_grade';
  const question = typeof body.question === 'string' ? body.question.slice(0, 2000) : undefined;
  const examInProgress = body.examInProgress === true;
  const examCode = typeof body.examCode === 'string' ? body.examCode.slice(0, 32) : 'ccaf';

  if (!sittingId || !itemId || !isTutorIntent(intent)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (examInProgress) {
    return NextResponse.json(
      { degraded: true, reason: 'unavailable_during_exam' },
      { status: 403 }
    );
  }

  if (!tutorEnabled()) {
    return NextResponse.json({ degraded: true, reason: 'tutor_disabled' });
  }

  if (!email || !pinHash || !supabaseAdmin) {
    return NextResponse.json(
      {
        error: 'premium_required',
        upgrade: { sku: 'per_exam_pass' },
      },
      { status: 402 }
    );
  }

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('pin_hash', pinHash)
    .maybeSingle();

  if (!user?.id) {
    return NextResponse.json(
      { error: 'premium_required', upgrade: { sku: 'per_exam_pass' } },
      { status: 402 }
    );
  }

  // When entitlements are enforced, require premium; when dark (off), allow identified users
  // so staging can exercise the ladder without flipping PAY-001.
  if (enforcementOn()) {
    const access = await resolveAccess(user.id, examCode);
    if (access.tier !== 'premium') {
      return NextResponse.json(
        {
          error: 'premium_required',
          upgrade: { sku: 'per_exam_pass' },
        },
        { status: 402 }
      );
    }
  }

  const result = await askTutor({
    userId: user.id,
    sittingId,
    itemId,
    intent,
    question,
    phase,
    examInProgress: false,
    examCode,
  });

  return NextResponse.json(result);
}
