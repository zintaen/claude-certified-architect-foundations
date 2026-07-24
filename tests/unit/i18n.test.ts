import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  catalogMessageKeys,
  formatDate,
  formatMoney,
  formatNumber,
  legalSensitiveKeys,
  localeReview,
  missingTranslationCount,
  resetMissingTranslationCounts,
  t,
  LOCALE_LADDER,
  SUPPORTED_LOCALES,
  ROUTED_LOCALES,
} from '../../src/i18n/config';

function enSourceHash(): string {
  const en = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/en.json'), 'utf8'));
  const { _meta: _, ...msgs } = en;
  void _;
  return createHash('sha256').update(JSON.stringify(msgs)).digest('hex').slice(0, 16);
}

describe('i18n (SCALE-001)', () => {
  beforeEach(() => {
    resetMissingTranslationCounts();
  });

  it('missing-key detector: catalog keys cover localized surfaces; typed keys resolve', () => {
    const keys = catalogMessageKeys('en');
    expect(keys.length).toBeGreaterThan(10);
    for (const k of keys) {
      expect(t('en', k)).not.toBe(k);
      expect(t('vi', k)).not.toMatch(/^⟦MISSING/);
    }
    expect(missingTranslationCount('vi')).toBe(0);
  });

  it('locale file review-header + source-hash match', () => {
    const review = localeReview('vi');
    expect(review).toBeTruthy();
    expect(review!.reviewer).toBeTruthy();
    expect(review!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(review!.source_hash).toBe(enSourceHash());
    expect(review!.legal_pages).toBe('english_with_notice');
  });

  it('legal-sensitive flags present on disclaimer/notice keys', () => {
    const flagged = legalSensitiveKeys();
    expect(flagged).toContain('disclaimer.independence');
    expect(flagged).toContain('disclaimer.trademark');
    expect(flagged).toContain('disclaimer.short');
  });

  it('prod fallback to English + counter', () => {
    const missing = t('vi', 'this.key.does.not.exist.at.all');
    expect(missing).toBe('this.key.does.not.exist.at.all');
    expect(missingTranslationCount('vi')).toBeGreaterThan(0);
    // Known key missing from vi would fall back — simulate via en-only by calling with garbage locale path:
    // All vi keys exist; counter already incremented above.
  });

  it('Intl formatting + price coexistence', () => {
    expect(formatNumber('vi', 1234.5)).toMatch(/1/);
    expect(formatDate('vi', new Date('2026-07-24T12:00:00Z'), { year: 'numeric' })).toMatch(/2026/);
    expect(formatMoney('vi', null, 'USD')).toMatch(/giá|Pricing|Chưa/i);
    expect(formatMoney('en', null, null)).toMatch(/unavailable/i);
    expect(formatMoney('vi', 29, 'USD')).toMatch(/29/);
  });

  it('supported locales + ladder documented', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('vi');
    expect(ROUTED_LOCALES).toEqual(['vi']);
    expect(LOCALE_LADDER[0]).toBe('vi');
  });

  it('translate script + playbook exist; dry-run default', () => {
    expect(existsSync(join(process.cwd(), 'scripts/translate-locale.mjs'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'docs/i18n-playbook.md'))).toBe(true);
    const script = readFileSync(join(process.cwd(), 'scripts/translate-locale.mjs'), 'utf8');
    expect(script).toMatch(/dryRun|dry_run|dry-run/);
    expect(script).toMatch(/--write/);
  });

  it('fences: no external TMS; catalogs in-repo', () => {
    const playbook = readFileSync(join(process.cwd(), 'docs/i18n-playbook.md'), 'utf8');
    expect(playbook.toLowerCase()).not.toMatch(/crowdin|lokalise|phrase\.com/);
    expect(existsSync(join(process.cwd(), 'src/i18n/vi.json'))).toBe(true);
  });
});
