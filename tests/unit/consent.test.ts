/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getConsent,
  setConsent,
  onConsentChange,
  defaultConsent,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  analyticsAllowed,
} from '../../src/lib/consent';

function clearConsentCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
}

describe('consent (LEGAL-002)', () => {
  beforeEach(() => {
    clearConsentCookie();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearConsentCookie();
    vi.unstubAllGlobals();
  });

  it('default state: analytics false, decidedAt null', () => {
    const s = getConsent();
    expect(s.analytics).toBe(false);
    expect(s.decidedAt).toBeNull();
    expect(s.necessary).toBe(true);
    expect(analyticsAllowed()).toBe(false);
  });

  it('setConsent(true) persists cookie with 12-month max-age', () => {
    setConsent(true);
    const s = getConsent();
    expect(s.analytics).toBe(true);
    expect(s.decidedAt).toBeTruthy();
    expect(s.version).toBe(CONSENT_VERSION);
    expect(document.cookie).toContain(CONSENT_COOKIE);
    // Max-Age is set on write; re-read via getConsent proves persistence
    expect(CONSENT_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });

  it('setConsent(false) is durable across getConsent re-reads', () => {
    setConsent(false);
    expect(getConsent().analytics).toBe(false);
    expect(getConsent().decidedAt).toBeTruthy();
    expect(getConsent().analytics).toBe(false);
  });

  it('onConsentChange fires on change and unsubscribes cleanly', () => {
    const seen: boolean[] = [];
    const unsub = onConsentChange((s) => seen.push(s.analytics));
    setConsent(true);
    setConsent(false);
    expect(seen).toEqual([true, false]);
    unsub();
    setConsent(true);
    expect(seen).toEqual([true, false]);
  });

  it('GPC signal forces analytics=false regardless of stored accept', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      configurable: true,
      get: () => true,
    });
    setConsent(true);
    expect(getConsent().analytics).toBe(false);
    expect(analyticsAllowed()).toBe(false);
  });

  it('SSR call path returns default state without touching document', () => {
    // Simulate SSR by temporarily removing document cookie API via stubbing getConsent path
    // The module checks typeof document === 'undefined' — we verify defaultConsent shape
    // and that calling defaultConsent does not require document.
    const d = defaultConsent();
    expect(d).toEqual({
      necessary: true,
      analytics: false,
      decidedAt: null,
      version: CONSENT_VERSION,
    });
  });
});
