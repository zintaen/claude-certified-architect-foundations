import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('GROWTH-003 referrals integration scaffolding', () => {
  it('referrals API is rate-classified', () => {
    expect(classify('/api/referrals', 'GET')).toBe('read');
    expect(classify('/api/referrals', 'POST')).toBe('write');
  });

  it('dashboard mounts ReferralShareCard', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
    expect(src).toMatch(/ReferralShareCard/);
  });

  it('grade path hooks onActivation with velocity', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/exam/grade/route.ts'), 'utf8');
    expect(src).toMatch(/onActivation/);
    expect(src).toMatch(/velocityKey/);
  });

  it('layout mounts ReferralCapture (consent-free ?ref=)', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/ReferralCapture/);
    const cap = readFileSync(join(process.cwd(), 'src/components/ReferralCapture.tsx'), 'utf8');
    expect(cap).toMatch(/sessionStorage/);
    expect(cap).toMatch(/referral_signup/);
    expect(cap).not.toMatch(/document\.cookie/);
  });

  it('no cash payouts in referral module', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/referrals.ts'), 'utf8');
    expect(src).not.toMatch(/payout|stripe\.payout|cash_reward/i);
    expect(src).toMatch(/grantEntitlement/);
  });

  it('GrantSource includes referral', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/entitlements.ts'), 'utf8');
    expect(src).toMatch(/'referral'/);
  });
});
