/**
 * Server-only entitlement resolution + grant path (PAY-001).
 * Ships dark: ENTITLEMENTS_ENFORCED=off|on (default off).
 */
import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { examByCode } from '@/lib/catalog';
import { SKUS, type SkuId } from '@/lib/skus';

export type Grant = {
  sku: SkuId;
  examId: string | null;
  endsAt: string | null;
  source: string;
};

export type AccessResolution = {
  tier: 'free' | 'premium';
  grants: Grant[];
};

export function enforcementOn(): boolean {
  return (process.env.ENTITLEMENTS_ENFORCED || 'off').toLowerCase() === 'on';
}

function admin() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin is not configured (SUPABASE_SERVICE_ROLE_KEY)');
  }
  return supabaseAdmin;
}

function isActiveSku(sku: string): sku is SkuId {
  return sku in SKUS && !SKUS[sku as SkuId].reserved;
}

/**
 * Resolve effective access. Anonymous (null userId) is always free.
 * Honors exam-scoped and all-access grants, expiry, and status.
 */
export async function resolveAccess(
  userId: string | null,
  examCode: string
): Promise<AccessResolution> {
  if (!userId || !supabaseAdmin) {
    return { tier: 'free', grants: [] };
  }

  const exam = await examByCode(examCode);
  const examId = exam?.id ?? null;

  const db = admin();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('entitlements')
    .select('sku, exam_id, status, source, ends_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw error;

  const grants: Grant[] = [];
  let premium = false;

  for (const row of data ?? []) {
    if (!isActiveSku(row.sku)) continue;
    if (row.ends_at && row.ends_at < now) continue;
    const def = SKUS[row.sku];
    const scopedOk =
      def.scope === 'all' || (def.scope === 'exam' && examId !== null && row.exam_id === examId);
    if (!scopedOk) continue;
    grants.push({
      sku: row.sku,
      examId: row.exam_id,
      endsAt: row.ends_at,
      source: row.source,
    });
    premium = true;
  }

  return { tier: premium ? 'premium' : 'free', grants };
}

export type GrantSource = 'manual' | 'paddle' | 'migration' | 'referral';

export async function grantEntitlement(input: {
  userId: string;
  sku: SkuId;
  examId?: string | null;
  source: GrantSource;
  actor: string;
  endsAt?: string | null;
  startsAt?: string;
  /** Merged into entitlement_events.metadata (PAY-002 paddle_event_id, eu_consent, …). */
  metadata?: Record<string, unknown>;
}): Promise<{ entitlementId: string; duplicate?: boolean }> {
  if (SKUS[input.sku]?.reserved) {
    throw new Error(`SKU ${input.sku} is reserved and not grantable`);
  }
  const db = admin();

  const paddleEventId =
    typeof input.metadata?.paddle_event_id === 'string' ? input.metadata.paddle_event_id : null;
  if (paddleEventId && input.source === 'paddle') {
    const { data: existing, error: findErr } = await db
      .from('entitlement_events')
      .select('id, metadata')
      .eq('source', 'paddle')
      .contains('metadata', { paddle_event_id: paddleEventId })
      .limit(1);
    if (findErr) throw findErr;
    if (existing && existing.length > 0) {
      const meta = (existing[0].metadata ?? {}) as { entitlement_id?: string };
      return { entitlementId: meta.entitlement_id ?? String(existing[0].id), duplicate: true };
    }
  }

  const startsAt = input.startsAt ?? new Date().toISOString();
  let endsAt = input.endsAt ?? null;
  if (endsAt === undefined || endsAt === null) {
    const days = SKUS[input.sku].durationDays;
    if (days !== null) {
      const d = new Date(startsAt);
      d.setUTCDate(d.getUTCDate() + days);
      endsAt = d.toISOString();
    }
  }

  const { data: ent, error } = await db
    .from('entitlements')
    .insert({
      user_id: input.userId,
      sku: input.sku,
      exam_id: input.examId ?? null,
      status: 'active',
      source: input.source,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: evErr } = await db.from('entitlement_events').insert({
    user_id: input.userId,
    sku: input.sku,
    exam_id: input.examId ?? null,
    kind: 'granted',
    source: input.source,
    actor: input.actor,
    metadata: { entitlement_id: ent.id, ...(input.metadata ?? {}) },
  });
  if (evErr) {
    // Unique index race: treat as idempotent success
    if (String(evErr.message || '').includes('paddle_event_id') && paddleEventId) {
      return { entitlementId: ent.id, duplicate: true };
    }
    throw evErr;
  }

  return { entitlementId: ent.id };
}

/** Mark active entitlements for sku/user expired (PAY-002 past-due / lifecycle). */
export async function expireEntitlement(input: {
  userId: string;
  sku: SkuId;
  actor: string;
  source?: GrantSource;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const db = admin();
  const { data: rows, error } = await db
    .from('entitlements')
    .select('id, exam_id')
    .eq('user_id', input.userId)
    .eq('sku', input.sku)
    .eq('status', 'active');
  if (error) throw error;
  let n = 0;
  for (const row of rows ?? []) {
    const { error: uErr } = await db
      .from('entitlements')
      .update({ status: 'expired', ends_at: new Date().toISOString() })
      .eq('id', row.id);
    if (uErr) throw uErr;
    const { error: evErr } = await db.from('entitlement_events').insert({
      user_id: input.userId,
      sku: input.sku,
      exam_id: row.exam_id,
      kind: 'expired',
      source: input.source ?? 'paddle',
      actor: input.actor,
      metadata: { entitlement_id: row.id, ...(input.metadata ?? {}) },
    });
    if (evErr) throw evErr;
    n += 1;
  }
  return n;
}

export async function revokeEntitlement(input: {
  entitlementId: string;
  userId: string;
  actor: string;
  source?: GrantSource;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = admin();
  const { data: row, error } = await db
    .from('entitlements')
    .select('id, sku, exam_id')
    .eq('id', input.entitlementId)
    .eq('user_id', input.userId)
    .single();
  if (error) throw error;

  const { error: uErr } = await db
    .from('entitlements')
    .update({ status: 'revoked' })
    .eq('id', input.entitlementId);
  if (uErr) throw uErr;

  const { error: evErr } = await db.from('entitlement_events').insert({
    user_id: input.userId,
    sku: row.sku,
    exam_id: row.exam_id,
    kind: 'revoked',
    source: input.source ?? 'manual',
    actor: input.actor,
    metadata: { entitlement_id: row.id, ...(input.metadata ?? {}) },
  });
  if (evErr) throw evErr;
}

/** Revoke all active rows for user+sku (subscription cancel / refund). */
export async function revokeEntitlementsForSku(input: {
  userId: string;
  sku: SkuId;
  actor: string;
  source?: GrantSource;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const db = admin();
  const { data: rows, error } = await db
    .from('entitlements')
    .select('id')
    .eq('user_id', input.userId)
    .eq('sku', input.sku)
    .eq('status', 'active');
  if (error) throw error;
  let n = 0;
  for (const row of rows ?? []) {
    await revokeEntitlement({
      entitlementId: row.id,
      userId: input.userId,
      actor: input.actor,
      source: input.source ?? 'paddle',
      metadata: input.metadata,
    });
    n += 1;
  }
  return n;
}

/** Count submitted exam-mode sittings for mock-limit enforcement. */
export async function countSubmittedExamMocks(userId: string, examId: string): Promise<number> {
  const db = admin();
  const { count, error } = await db
    .from('sittings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .eq('mode', 'exam')
    .not('submitted_at', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

export class FreeMockLimitError extends Error {
  readonly code = 'free_mock_limit' as const;
  constructor(
    public examCode: string,
    public freeMocksUsed: number
  ) {
    super('free_mock_limit');
    this.name = 'FreeMockLimitError';
  }
}
