import { describe, it, expect } from 'vitest';
import { ACTIVE_SKU_IDS, SKUS } from '@/lib/skus';
import { freePolicyForExam, pickFreeSubset } from '@/lib/freePolicy';
import { UPGRADE_PROMPT_FORBIDDEN } from '@/components/UpgradePrompt';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PAY-001 entitlements unit', () => {
  it('sku ids pinned; scope/duration shapes', () => {
    expect(ACTIVE_SKU_IDS).toEqual([
      'per_exam_pass',
      'all_access_monthly',
      'all_access_annual',
      'lifetime',
    ]);
    expect(SKUS.per_exam_pass.scope).toBe('exam');
    expect(SKUS.per_exam_pass.durationDays).toBe(90);
    expect(SKUS.lifetime.scope).toBe('all');
    expect(SKUS.lifetime.durationDays).toBeNull();
    expect(SKUS.team_seats.reserved).toBe(true);
  });

  it('caps and mock count read from exam config', () => {
    const p = freePolicyForExam('ccaf');
    expect(p.free_question_cap).toBeGreaterThanOrEqual(20);
    expect(p.free_question_cap).toBeLessThanOrEqual(40);
    expect(p.free_full_mocks).toBe(1);
  });

  it('free subset stable across assemblies (set equality)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${String(i).padStart(3, '0')}`,
    }));
    const a = pickFreeSubset(items, 30).map((x) => x.id);
    const b = pickFreeSubset(items, 30).map((x) => x.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(30);
  });

  it('upgrade prompt copy passes no-dark-pattern lint list', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/UpgradePrompt.tsx'), 'utf8');
    // Lint user-facing COPY only — not the forbidden-pattern registry itself.
    const copyBlock = src.match(/const COPY[\s\S]*?};/)?.[0] ?? '';
    expect(copyBlock.length).toBeGreaterThan(40);
    for (const pat of UPGRADE_PROMPT_FORBIDDEN) {
      expect(copyBlock.toLowerCase()).not.toMatch(new RegExp(pat, 'i'));
    }
  });

  it('enforcement defaults off (byte-identical dark launch)', async () => {
    delete process.env.ENTITLEMENTS_ENFORCED;
    const { enforcementOn } = await import('@/lib/entitlements');
    expect(enforcementOn()).toBe(false);
  });

  it('grep: no payment SDK imports in pay modules', () => {
    for (const rel of [
      'src/lib/skus.ts',
      'src/lib/entitlements.ts',
      'src/lib/freePolicy.ts',
      'src/app/api/entitlements/route.ts',
      'src/components/UpgradePrompt.tsx',
    ]) {
      const text = readFileSync(join(process.cwd(), rel), 'utf8');
      // Source-label 'paddle' is allowed (PAY-002 webhook source); SDK imports are not.
      expect(text).not.toMatch(/from ['"]@paddle|from ['"]paddle|stripe-js|lemonsqueezy/i);
      expect(text).not.toMatch(/require\(['"]@paddle/);
    }
  });
});
