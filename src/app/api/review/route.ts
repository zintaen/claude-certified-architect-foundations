import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';
import { dueCards, enrollFlashcard, gradeCard, setSuspended } from '@/lib/review';
import type { Grade } from '@/lib/srs';

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
    classify('/api/review', 'GET'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';
  const exam = url.searchParams.get('exam')?.trim().toLowerCase() || undefined;
  const tzOffset = Number(url.searchParams.get('tzOffset') || '0');
  const userId = await resolveUser(email, pinHash);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (enforcementOn()) {
    const access = await resolveAccess(userId, exam || 'ccaf');
    if (access.tier !== 'premium') {
      // Accrual silent for free; queue is premium
      return NextResponse.json(
        { error: 'premium_required', upgrade: { reason: 'srs_review' }, dueCount: null },
        { status: 403 }
      );
    }
  }

  const result = await dueCards(userId, {
    examCode: exam,
    tzOffsetMinutes: Number.isFinite(tzOffset) ? tzOffset : 0,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/review', 'POST'),
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
  const userId = await resolveUser(email, pinHash);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const op = body.op;

  if (op === 'enroll_flashcard') {
    const key = typeof body.flashcardKey === 'string' ? body.flashcardKey : '';
    await enrollFlashcard({ userId, flashcardKey: key });
    return NextResponse.json({ ok: true });
  }

  if (op === 'suspend') {
    const cardId = typeof body.cardId === 'string' ? body.cardId : '';
    await setSuspended(userId, cardId, true);
    return NextResponse.json({ ok: true });
  }

  if (op === 'grade') {
    if (enforcementOn()) {
      const access = await resolveAccess(userId, 'ccaf');
      if (access.tier !== 'premium') {
        return NextResponse.json({ error: 'premium_required' }, { status: 403 });
      }
    }
    const cardId = typeof body.cardId === 'string' ? body.cardId : '';
    const grade = body.grade as Grade;
    if (!['again', 'hard', 'good', 'easy'].includes(grade)) {
      return NextResponse.json({ error: 'bad_grade' }, { status: 400 });
    }
    const next = await gradeCard({ userId, cardId, grade });
    return NextResponse.json({ next });
  }

  return NextResponse.json({ error: 'unknown_op' }, { status: 400 });
}
