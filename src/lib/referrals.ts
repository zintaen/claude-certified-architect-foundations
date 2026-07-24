/**
 * Referral program (GROWTH-003). Rewards = premium days via grantEntitlement.
 * With ENTITLEMENTS_ENFORCED=off, attribute + count but defer reward issuance.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { enforcementOn, grantEntitlement } from '@/lib/entitlements';
import { hitReferralQualifyBudget } from '@/lib/rateLimit';
import { DEFAULT_SITE_ORIGIN } from '@/lib/site';

export const REFERRAL_CONFIG = {
  rewardDaysReferrer: Number(process.env.REFERRAL_REWARD_DAYS_REFERRER || 7),
  rewardDaysReferred: Number(process.env.REFERRAL_REWARD_DAYS_REFERRED || 3),
  monthlyRewardCap: Number(process.env.REFERRAL_MONTHLY_CAP || 5),
  anomalyQualRatePerDay: Number(process.env.REFERRAL_ANOMALY_QUAL_PER_DAY || 20),
  disposableDomains: (
    process.env.REFERRAL_DISPOSABLE_DOMAINS ||
    'mailinator.com,guerrillamail.com,tempmail.com,10minutemail.com'
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

function admin() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin required');
  return supabaseAdmin;
}

function makeCode(userId: string): string {
  return createHash('sha256').update(`ref:${userId}`).digest('hex').slice(0, 10);
}

export function hashReferralCode(code: string): string {
  return createHash('sha256').update(code.toLowerCase()).digest('hex').slice(0, 16);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return REFERRAL_CONFIG.disposableDomains.includes(domain);
}

export async function codeFor(userId: string): Promise<string> {
  const db = admin();
  const { data: existing } = await db
    .from('referrals')
    .select('code')
    .eq('referrer_user_id', userId)
    .maybeSingle();
  if (existing?.code) return existing.code as string;

  const code = makeCode(userId);
  const { error } = await db.from('referrals').insert({
    code,
    referrer_user_id: userId,
  });
  if (error) {
    // Race: another insert won
    const { data: again } = await db
      .from('referrals')
      .select('code')
      .eq('referrer_user_id', userId)
      .maybeSingle();
    if (again?.code) return again.code as string;
    throw error;
  }
  return code;
}

export function shareUrl(code: string, origin = DEFAULT_SITE_ORIGIN): string {
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

export type BindResult =
  | 'bound'
  | 'rejected_self'
  | 'rejected_bound'
  | 'rejected_abuse'
  | 'rejected_missing'
  | 'rejected_circular';

export async function bindReferral(code: string, newUserId: string): Promise<BindResult> {
  const db = admin();
  const normalized = code.trim().toLowerCase();
  if (!normalized) return 'rejected_missing';

  const { data: row } = await db
    .from('referrals')
    .select('code, referrer_user_id')
    .eq('code', normalized)
    .maybeSingle();
  if (!row) return 'rejected_missing';
  if (row.referrer_user_id === newUserId) return 'rejected_self';

  const { data: prior } = await db
    .from('referral_events')
    .select('id')
    .eq('referred_user_id', newUserId)
    .eq('kind', 'signup')
    .maybeSingle();
  if (prior) return 'rejected_bound';

  // Circular: new user previously referred this code's owner.
  const { data: newUserRef } = await db
    .from('referrals')
    .select('code')
    .eq('referrer_user_id', newUserId)
    .maybeSingle();
  if (newUserRef?.code) {
    const { data: circ } = await db
      .from('referral_events')
      .select('id')
      .eq('code', newUserRef.code)
      .eq('referred_user_id', row.referrer_user_id)
      .eq('kind', 'signup')
      .maybeSingle();
    if (circ) return 'rejected_circular';
  }

  const { error } = await db.from('referral_events').insert({
    code: row.code,
    referred_user_id: newUserId,
    kind: 'signup',
    metadata: {},
  });
  if (error) return 'rejected_bound';
  return 'bound';
}

async function monthlyRewardCount(referrerUserId: string): Promise<number> {
  const db = admin();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: codes } = await db
    .from('referrals')
    .select('code')
    .eq('referrer_user_id', referrerUserId);
  if (!codes?.length) return 0;
  const code = codes[0]!.code as string;
  const { count } = await db
    .from('referral_events')
    .select('id', { count: 'exact', head: true })
    .eq('code', code)
    .eq('kind', 'rewarded')
    .gte('created_at', monthStart.toISOString());
  return count ?? 0;
}

async function shouldHold(code: string): Promise<boolean> {
  const db = admin();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from('referral_events')
    .select('id', { count: 'exact', head: true })
    .eq('code', code)
    .eq('kind', 'qualified')
    .gte('created_at', dayStart.toISOString());
  return (count ?? 0) >= REFERRAL_CONFIG.anomalyQualRatePerDay;
}

async function issueRewards(opts: {
  code: string;
  referredUserId: string;
  referrerUserId: string;
}): Promise<'rewarded' | 'held_cap'> {
  const db = admin();
  const rewardedThisMonth = await monthlyRewardCount(opts.referrerUserId);
  if (rewardedThisMonth >= REFERRAL_CONFIG.monthlyRewardCap) {
    await db.from('referral_events').insert({
      code: opts.code,
      referred_user_id: opts.referredUserId,
      kind: 'held',
      metadata: { reason: 'monthly_cap' },
    });
    return 'held_cap';
  }

  const endsReferrer = new Date();
  endsReferrer.setUTCDate(endsReferrer.getUTCDate() + REFERRAL_CONFIG.rewardDaysReferrer);
  await grantEntitlement({
    userId: opts.referrerUserId,
    sku: 'all_access_monthly',
    source: 'referral',
    actor: 'referral_system',
    endsAt: endsReferrer.toISOString(),
  });

  if (REFERRAL_CONFIG.rewardDaysReferred > 0) {
    const endsReferred = new Date();
    endsReferred.setUTCDate(endsReferred.getUTCDate() + REFERRAL_CONFIG.rewardDaysReferred);
    await grantEntitlement({
      userId: opts.referredUserId,
      sku: 'all_access_monthly',
      source: 'referral',
      actor: 'referral_system',
      endsAt: endsReferred.toISOString(),
    });
  }

  await db.from('referral_events').insert({
    code: opts.code,
    referred_user_id: opts.referredUserId,
    kind: 'rewarded',
    metadata: {
      referrer_days: REFERRAL_CONFIG.rewardDaysReferrer,
      referred_days: REFERRAL_CONFIG.rewardDaysReferred,
    },
  });
  return 'rewarded';
}

export type ActivationOpts = {
  /** Client IP or device key for velocity budgeting. */
  velocityKey?: string;
};

/**
 * Called when a user completes their first graded mock (activation).
 */
export async function onActivation(
  userId: string,
  opts: ActivationOpts = {}
): Promise<{ codeHash?: string; status: string }> {
  const db = admin();
  const { data: signup } = await db
    .from('referral_events')
    .select('code, referred_user_id')
    .eq('referred_user_id', userId)
    .eq('kind', 'signup')
    .maybeSingle();
  if (!signup) return { status: 'no_referral' };

  const { data: already } = await db
    .from('referral_events')
    .select('id')
    .eq('referred_user_id', userId)
    .eq('kind', 'qualified')
    .maybeSingle();
  if (already)
    return { status: 'already_qualified', codeHash: hashReferralCode(signup.code as string) };

  await db.from('referral_events').insert({
    code: signup.code,
    referred_user_id: userId,
    kind: 'qualified',
    metadata: {},
  });

  if (opts.velocityKey) {
    const vel = await hitReferralQualifyBudget(opts.velocityKey);
    if (!vel.allowed) {
      await db.from('referral_events').insert({
        code: signup.code,
        referred_user_id: userId,
        kind: 'held',
        metadata: { reason: 'velocity_limit' },
      });
      return { status: 'held_velocity', codeHash: hashReferralCode(signup.code as string) };
    }
  }

  const hold = await shouldHold(signup.code as string);
  if (hold) {
    await db.from('referral_events').insert({
      code: signup.code,
      referred_user_id: userId,
      kind: 'held',
      metadata: { reason: 'anomaly_qual_rate' },
    });
    return { status: 'held_anomaly', codeHash: hashReferralCode(signup.code as string) };
  }

  if (!enforcementOn()) {
    await db.from('referral_events').insert({
      code: signup.code,
      referred_user_id: userId,
      kind: 'held',
      metadata: { reason: 'enforcement_off_deferred' },
    });
    return { status: 'deferred', codeHash: hashReferralCode(signup.code as string) };
  }

  const { data: ref } = await db
    .from('referrals')
    .select('referrer_user_id')
    .eq('code', signup.code)
    .single();
  if (!ref) return { status: 'missing_referrer' };

  const outcome = await issueRewards({
    code: signup.code as string,
    referredUserId: userId,
    referrerUserId: ref.referrer_user_id as string,
  });
  return {
    status: outcome,
    codeHash: hashReferralCode(signup.code as string),
  };
}

/**
 * Flip-time / operator: grant rewards for held rows with reason enforcement_off_deferred.
 * Idempotent: skips referred users that already have a `rewarded` event.
 */
export async function backfillDeferredRewards(
  limit = 200
): Promise<{ granted: number; skipped: number }> {
  const db = admin();
  if (!enforcementOn()) return { granted: 0, skipped: 0 };

  const { data: held } = await db
    .from('referral_events')
    .select('id, code, referred_user_id, metadata')
    .eq('kind', 'held')
    .order('id', { ascending: true })
    .limit(limit);

  let granted = 0;
  let skipped = 0;
  for (const row of held ?? []) {
    const meta = (row.metadata ?? {}) as { reason?: string };
    if (meta.reason !== 'enforcement_off_deferred') {
      skipped += 1;
      continue;
    }
    const { data: rewarded } = await db
      .from('referral_events')
      .select('id')
      .eq('referred_user_id', row.referred_user_id)
      .eq('kind', 'rewarded')
      .maybeSingle();
    if (rewarded) {
      skipped += 1;
      continue;
    }
    const { data: ref } = await db
      .from('referrals')
      .select('referrer_user_id')
      .eq('code', row.code)
      .maybeSingle();
    if (!ref) {
      skipped += 1;
      continue;
    }
    const outcome = await issueRewards({
      code: row.code as string,
      referredUserId: row.referred_user_id as string,
      referrerUserId: ref.referrer_user_id as string,
    });
    if (outcome === 'rewarded') granted += 1;
    else skipped += 1;
  }
  return { granted, skipped };
}

/**
 * Operator disposition: release a held referral (anomaly/velocity) via audited grant path.
 */
export async function releaseHeldReferral(
  referredUserId: string,
  actor: string
): Promise<'released' | 'not_held' | 'already_rewarded'> {
  const db = admin();
  const { data: held } = await db
    .from('referral_events')
    .select('code')
    .eq('referred_user_id', referredUserId)
    .eq('kind', 'held')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!held) return 'not_held';

  const { data: rewarded } = await db
    .from('referral_events')
    .select('id')
    .eq('referred_user_id', referredUserId)
    .eq('kind', 'rewarded')
    .maybeSingle();
  if (rewarded) return 'already_rewarded';

  const { data: ref } = await db
    .from('referrals')
    .select('referrer_user_id')
    .eq('code', held.code)
    .single();
  if (!ref) return 'not_held';

  const endsReferrer = new Date();
  endsReferrer.setUTCDate(endsReferrer.getUTCDate() + REFERRAL_CONFIG.rewardDaysReferrer);
  await grantEntitlement({
    userId: ref.referrer_user_id as string,
    sku: 'all_access_monthly',
    source: 'referral',
    actor,
    endsAt: endsReferrer.toISOString(),
  });
  if (REFERRAL_CONFIG.rewardDaysReferred > 0) {
    const endsReferred = new Date();
    endsReferred.setUTCDate(endsReferred.getUTCDate() + REFERRAL_CONFIG.rewardDaysReferred);
    await grantEntitlement({
      userId: referredUserId,
      sku: 'all_access_monthly',
      source: 'referral',
      actor,
      endsAt: endsReferred.toISOString(),
    });
  }
  await db.from('referral_events').insert({
    code: held.code,
    referred_user_id: referredUserId,
    kind: 'rewarded',
    metadata: { disposition: 'operator_release', actor },
  });
  return 'released';
}

export async function referralStats(userId: string): Promise<{
  code: string;
  shareUrl: string;
  invited: number;
  qualified: number;
  rewarded: number;
}> {
  const code = await codeFor(userId);
  const db = admin();
  const kinds = ['signup', 'qualified', 'rewarded'] as const;
  const counts = { invited: 0, qualified: 0, rewarded: 0 };
  for (const kind of kinds) {
    const { count } = await db
      .from('referral_events')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
      .eq('kind', kind);
    if (kind === 'signup') counts.invited = count ?? 0;
    if (kind === 'qualified') counts.qualified = count ?? 0;
    if (kind === 'rewarded') counts.rewarded = count ?? 0;
  }
  return { code, shareUrl: shareUrl(code), ...counts };
}
