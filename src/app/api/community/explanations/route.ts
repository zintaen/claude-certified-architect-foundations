import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import {
  approvedCountFor,
  approvedFor,
  flag,
  hashItemId,
  submitExplanation,
  vote,
} from '@/lib/community';

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
 * GET ?itemId= → approved explanations (public read via service)
 * GET ?email=&pinHash=&op=count → contributor approved count
 * POST ops: submit | vote | flag
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/community/explanations', 'GET'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const pinHash = url.searchParams.get('pinHash')?.trim() ?? '';

  if (op === 'count') {
    const userId = await resolveUser(email, pinHash);
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const count = await approvedCountFor(userId);
    return NextResponse.json({ approvedCount: count });
  }

  const itemId = url.searchParams.get('itemId')?.trim() ?? '';
  if (!itemId) return NextResponse.json({ error: 'itemId_required' }, { status: 400 });
  const versionRaw = url.searchParams.get('version');
  const version = versionRaw ? Number(versionRaw) : undefined;
  const list = await approvedFor(itemId, Number.isFinite(version) ? version : undefined);
  return NextResponse.json({
    explanations: list,
    itemIdHash: hashItemId(itemId),
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/community/explanations', 'POST'),
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

  if (op === 'submit') {
    const itemId = typeof body.itemId === 'string' ? body.itemId : '';
    const text = typeof body.body === 'string' ? body.body : '';
    const itemVersion = typeof body.itemVersion === 'number' ? body.itemVersion : 1;
    const result = await submitExplanation({
      userId,
      email,
      itemId,
      itemVersion,
      body: text,
    });
    return NextResponse.json({
      result,
      itemIdHash: hashItemId(itemId),
    });
  }

  if (op === 'vote') {
    const explanationId = typeof body.explanationId === 'string' ? body.explanationId : '';
    const result = await vote(explanationId, userId);
    return NextResponse.json({ result });
  }

  if (op === 'flag') {
    const explanationId = typeof body.explanationId === 'string' ? body.explanationId : '';
    const reason = typeof body.reason === 'string' ? body.reason : 'user_flag';
    await flag(explanationId, userId, reason);
    return NextResponse.json({
      ok: true,
      itemIdHash: typeof body.itemId === 'string' ? hashItemId(body.itemId) : undefined,
    });
  }

  return NextResponse.json({ error: 'unknown_op' }, { status: 400 });
}
