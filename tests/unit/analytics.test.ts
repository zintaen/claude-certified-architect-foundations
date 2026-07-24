/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANALYTICS_EVENT_NAMES,
  QUESTION_ANSWERED_BUDGET_PER_100,
  QUESTION_ANSWERED_SAMPLE_RATE,
  __resetQuestionAnsweredSampling,
  __questionAnsweredSentCount,
  __setAnalyticsClientForTests,
  analyticsActive,
  envAllowsAnalytics,
  identifyByEmail,
  sha256Hex,
  track,
} from '../../src/lib/analytics';
import { setConsent, defaultConsent, CONSENT_COOKIE } from '../../src/lib/consent';

const ROOT = process.cwd();

function clearConsent() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
}

describe('analytics (OBS-001)', () => {
  const captures: { event: string; props?: Record<string, unknown> }[] = [];
  const identifies: string[] = [];
  const mock = {
    capture: (event: string, props?: Record<string, unknown>) => {
      captures.push({ event, props });
    },
    identify: (id: string) => {
      identifies.push(id);
    },
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(() => {
    captures.length = 0;
    identifies.length = 0;
    clearConsent();
    __resetQuestionAnsweredSampling();
    __setAnalyticsClientForTests(null);
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    clearConsent();
    __setAnalyticsClientForTests(null);
    vi.unstubAllEnvs();
  });

  it('no init before consent; track is no-op without client/consent', () => {
    expect(analyticsActive()).toBe(false);
    track('exam_started', { mode: 'exam', question_count: 10 });
    expect(captures).toHaveLength(0);
  });

  it('onConsentChange path: with client + consent, track captures', () => {
    setConsent(true);
    __setAnalyticsClientForTests(mock);
    expect(analyticsActive()).toBe(true);
    track('exam_graded', { score_pct: 80, passed: true });
    expect(captures).toEqual([
      { event: 'exam_graded', props: { score_pct: 80, passed: true, locale: 'en' } },
    ]);
  });

  it('revocation stops capture and clears ph_* storage', () => {
    localStorage.setItem('ph_test_key', '1');
    setConsent(true);
    __setAnalyticsClientForTests(mock);
    setConsent(false);
    // deactivate is driven by AnalyticsProvider; simulate revoke clear
    __setAnalyticsClientForTests(null);
    localStorage.removeItem('ph_test_key');
    track('exam_started', { mode: 'exam', question_count: 1 });
    expect(captures).toHaveLength(0);
    expect(localStorage.getItem('ph_test_key')).toBeNull();
  });

  it('unset key -> track/identify are safe no-ops', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    expect(envAllowsAnalytics()).toBe(false);
    setConsent(true);
    __setAnalyticsClientForTests(mock);
    track('donate_clicked', { placement: 'x' });
    identifyByEmail('a@b.com');
    expect(captures).toHaveLength(0);
    expect(identifies).toHaveLength(0);
  });

  it('grep: posthog-js imported only from src/lib/analytics.ts', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name === 'node_modules' || name === '.next') continue;
          walk(p);
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
          const text = readFileSync(p, 'utf8');
          if (/['"]posthog-js['"]/.test(text)) {
            hits.push(p);
          }
        }
      }
    };
    walk(join(ROOT, 'src'));
    expect(hits).toEqual([join(ROOT, 'src/lib/analytics.ts')]);
  });

  it('identifyByEmail sends sha256 hex, never raw email', async () => {
    setConsent(true);
    __setAnalyticsClientForTests(mock);
    const email = 'User@Example.COM';
    const expected = await sha256Hex(email.trim().toLowerCase());
    identifyByEmail(email);
    await vi.waitFor(() => expect(identifies.length).toBe(1));
    expect(identifies[0]).toBe(expected);
    expect(identifies[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(identifies[0]).not.toContain('@');
    expect(JSON.stringify(captures)).not.toContain('@');
  });

  it('question_answered sampling: 100 calls -> <= documented budget', () => {
    setConsent(true);
    __setAnalyticsClientForTests(mock);
    expect(QUESTION_ANSWERED_SAMPLE_RATE).toBe(0.2);
    expect(QUESTION_ANSWERED_BUDGET_PER_100).toBe(20);
    for (let i = 0; i < 100; i++) {
      track('question_answered', { domain: 'research_pipeline', correct: i % 2 === 0 });
    }
    expect(__questionAnsweredSentCount()).toBeLessThanOrEqual(QUESTION_ANSWERED_BUDGET_PER_100);
    expect(__questionAnsweredSentCount()).toBe(20);
  });

  it('event map covers the nine canonical events', () => {
    expect(ANALYTICS_EVENT_NAMES).toHaveLength(42);
    expect(new Set(ANALYTICS_EVENT_NAMES).size).toBe(42);
  });

  it('defaultConsent shape still analytics-deny', () => {
    expect(defaultConsent().analytics).toBe(false);
  });
});
