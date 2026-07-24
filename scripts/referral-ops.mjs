#!/usr/bin/env node
/**
 * GROWTH-003 referral ops (dry-run by default).
 *
 *   node scripts/referral-ops.mjs --backfill
 *   node scripts/referral-ops.mjs --backfill --execute
 *   node scripts/referral-ops.mjs --release-held --email=a@b.com --actor=ops --execute
 */
import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  })
);

const execute = args.execute === 'true' || args.execute === '';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enforcement = (process.env.ENTITLEMENTS_ENFORCED || 'off').toLowerCase() === 'on';

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const rewardDaysReferrer = Number(process.env.REFERRAL_REWARD_DAYS_REFERRER || 7);
const rewardDaysReferred = Number(process.env.REFERRAL_REWARD_DAYS_REFERRED || 3);
const monthlyCap = Number(process.env.REFERRAL_MONTHLY_CAP || 5);
const actor = String(args.actor || 'operator');

async function grantDays(userId, days, meta) {
  const ends = new Date();
  ends.setUTCDate(ends.getUTCDate() + days);
  const { data: ent, error } = await db
    .from('entitlements')
    .insert({
      user_id: userId,
      sku: 'all_access_monthly',
      status: 'active',
      source: 'referral',
      starts_at: new Date().toISOString(),
      ends_at: ends.toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  const { error: evErr } = await db.from('entitlement_events').insert({
    user_id: userId,
    sku: 'all_access_monthly',
    kind: 'granted',
    source: 'referral',
    actor,
    metadata: { entitlement_id: ent.id, ...meta },
  });
  if (evErr) throw evErr;
}

async function monthlyRewarded(code) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from('referral_events')
    .select('id', { count: 'exact', head: true })
    .eq('code', code)
    .eq('kind', 'rewarded')
    .gte('created_at', monthStart.toISOString());
  return count ?? 0;
}

async function issuePair(code, referredUserId, referrerUserId) {
  if ((await monthlyRewarded(code)) >= monthlyCap) {
    console.log(`Cap hit for code ${code}; skip`);
    return false;
  }
  await grantDays(referrerUserId, rewardDaysReferrer, { role: 'referrer' });
  if (rewardDaysReferred > 0) {
    await grantDays(referredUserId, rewardDaysReferred, { role: 'referred' });
  }
  await db.from('referral_events').insert({
    code,
    referred_user_id: referredUserId,
    kind: 'rewarded',
    metadata: { disposition: 'script', actor },
  });
  return true;
}

async function backfill() {
  if (!enforcement) {
    console.log('ENTITLEMENTS_ENFORCED is not on — backfill is a no-op until flip.');
    return;
  }
  const { data: held, error } = await db
    .from('referral_events')
    .select('id, code, referred_user_id, metadata')
    .eq('kind', 'held')
    .order('id', { ascending: true })
    .limit(200);
  if (error) throw error;

  let granted = 0;
  let skipped = 0;
  for (const row of held ?? []) {
    const reason = row.metadata?.reason;
    if (reason !== 'enforcement_off_deferred') {
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
    console.log(
      `Would grant deferred reward for referred=${row.referred_user_id} code=${row.code}`
    );
    if (!execute) {
      skipped += 1;
      continue;
    }
    const ok = await issuePair(row.code, row.referred_user_id, ref.referrer_user_id);
    if (ok) granted += 1;
    else skipped += 1;
  }
  console.log(JSON.stringify({ granted, skipped, execute }));
  if (!execute) console.log('DRY RUN - pass --execute to apply.');
}

async function releaseHeld() {
  const email = String(args.email || '')
    .trim()
    .toLowerCase();
  if (!email) {
    console.error('Required: --email=');
    process.exit(1);
  }
  const { data: user } = await db.from('users').select('id').eq('email', email).maybeSingle();
  if (!user) {
    console.error(`No user for ${email}`);
    process.exit(1);
  }
  const { data: held } = await db
    .from('referral_events')
    .select('code')
    .eq('referred_user_id', user.id)
    .eq('kind', 'held')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!held) {
    console.log('No held row for user');
    return;
  }
  const { data: rewarded } = await db
    .from('referral_events')
    .select('id')
    .eq('referred_user_id', user.id)
    .eq('kind', 'rewarded')
    .maybeSingle();
  if (rewarded) {
    console.log('Already rewarded');
    return;
  }
  const { data: ref } = await db
    .from('referrals')
    .select('referrer_user_id')
    .eq('code', held.code)
    .single();
  console.log(`Would release held referral code=${held.code} referred=${user.id}`);
  if (!execute) {
    console.log('DRY RUN - pass --execute to apply.');
    return;
  }
  await issuePair(held.code, user.id, ref.referrer_user_id);
  console.log('Released.');
}

async function main() {
  if (args.backfill !== undefined) return backfill();
  if (args['release-held'] !== undefined) return releaseHeld();
  console.error('Use --backfill or --release-held');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
