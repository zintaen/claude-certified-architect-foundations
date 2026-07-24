import { describe, it, expect } from 'vitest';
import { REFERRAL_CONFIG, hashReferralCode, isDisposableEmail, shareUrl } from '@/lib/referrals';
import {
  REFERRAL_QUAL_BUDGET,
  hitReferralQualifyBudget,
  __resetRateLimitStoreForTests,
} from '@/lib/rateLimit';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('GROWTH-003 referrals unit', () => {
  it('config has reward days and caps', () => {
    expect(REFERRAL_CONFIG.rewardDaysReferrer).toBeGreaterThan(0);
    expect(REFERRAL_CONFIG.monthlyRewardCap).toBeGreaterThan(0);
  });

  it('disposable email rejection', () => {
    expect(isDisposableEmail('a@mailinator.com')).toBe(true);
    expect(isDisposableEmail('a@gmail.com')).toBe(false);
  });

  it('share URL is first-party query param', () => {
    expect(shareUrl('abc123')).toMatch(/\?ref=abc123/);
  });

  it('code hash is stable and not the raw code', () => {
    const h = hashReferralCode('abc');
    expect(h).toHaveLength(16);
    expect(h).not.toBe('abc');
    expect(hashReferralCode('ABC')).toBe(h);
  });

  it('velocity budget trips after max hits', async () => {
    __resetRateLimitStoreForTests();
    const key = `test-${Date.now()}`;
    let blocked = false;
    for (let i = 0; i < REFERRAL_QUAL_BUDGET.max + 1; i++) {
      const r = await hitReferralQualifyBudget(key);
      if (!r.allowed) blocked = true;
    }
    expect(blocked).toBe(true);
  });

  it('migration append-only events', () => {
    expect(
      existsSync(join(process.cwd(), 'supabase/migrations/20261010000000_referrals.sql'))
    ).toBe(true);
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261010000000_referrals.sql'),
      'utf8'
    );
    expect(sql).toMatch(/referral_events/);
    expect(sql).toMatch(/revoke update, delete/i);
  });

  it('copy has no dark patterns', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/ReferralShareCard.tsx'), 'utf8');
    expect(src.toLowerCase()).not.toMatch(/\bhurry\b|\bact now\b|\blimited time\b/);
    expect(src.toLowerCase()).not.toMatch(/\bpartner\b/);
  });

  it('analytics events present', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/referral_link_shared/);
    expect(src).toMatch(/referral_signup/);
    expect(src).toMatch(/referral_qualified/);
  });

  it('backfill + release helpers exist', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/referrals.ts'), 'utf8');
    expect(src).toMatch(/backfillDeferredRewards/);
    expect(src).toMatch(/releaseHeldReferral/);
    expect(src).toMatch(/rejected_circular/);
    expect(existsSync(join(process.cwd(), 'scripts/referral-ops.mjs'))).toBe(true);
  });

  it('fence: no cash payouts', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/referrals.ts'), 'utf8');
    expect(src).not.toMatch(/payout|stripe\.payout|cash_reward/i);
  });
});
