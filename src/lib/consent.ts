/**
 * First-party consent gate (LEGAL-002).
 * Categories: necessary (always on) + analytics (opt-in, default deny).
 */
export type ConsentCategory = 'necessary' | 'analytics';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  decidedAt: string | null;
  version: number;
}

export const CONSENT_COOKIE = 'csk_consent';
export const CONSENT_VERSION = 1;
/** 12 months in seconds */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export const CONSENT_EVENT = 'csk:consent';

export function defaultConsent(): ConsentState {
  return {
    necessary: true,
    analytics: false,
    decidedAt: null,
    version: CONSENT_VERSION,
  };
}

function readCookieRaw(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1));
}

function writeCookie(state: ConsentState): void {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax`;
}

function gpcRejectsAnalytics(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

export function getConsent(): ConsentState {
  // SSR-safe default
  if (typeof document === 'undefined') return defaultConsent();

  const raw = readCookieRaw();
  let parsed: ConsentState | null = null;
  if (raw) {
    try {
      const obj = JSON.parse(raw) as Partial<ConsentState>;
      if (obj && obj.necessary === true && typeof obj.analytics === 'boolean') {
        parsed = {
          necessary: true,
          analytics: obj.analytics,
          decidedAt: typeof obj.decidedAt === 'string' ? obj.decidedAt : null,
          version: typeof obj.version === 'number' ? obj.version : CONSENT_VERSION,
        };
        // Schema bump re-prompts
        if (parsed.version !== CONSENT_VERSION) {
          parsed = defaultConsent();
        }
      }
    } catch {
      parsed = null;
    }
  }

  const state = parsed ?? defaultConsent();

  // GPC is a standing rejection of analytics
  if (gpcRejectsAnalytics()) {
    return {
      ...state,
      analytics: false,
      decidedAt: state.decidedAt ?? new Date().toISOString(),
    };
  }

  return state;
}

export function setConsent(analytics: boolean): void {
  if (typeof document === 'undefined') return;
  const forced = gpcRejectsAnalytics();
  const state: ConsentState = {
    necessary: true,
    analytics: forced ? false : analytics,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  writeCookie(state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  }
}

export function onConsentChange(cb: (s: ConsentState) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ConsentState>).detail;
    cb(detail ?? getConsent());
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

export function analyticsAllowed(): boolean {
  return getConsent().analytics === true;
}

/** Policy version metadata rendered on each legal page. */
export interface PolicyMeta {
  version: string;
  effective: string;
}

export const TERMS_META: PolicyMeta = { version: '1.0', effective: '2026-07-24' };
export const PRIVACY_META: PolicyMeta = { version: '1.1', effective: '2026-07-24' };
export const AUP_META: PolicyMeta = { version: '1.0', effective: '2026-07-24' };
export const REFUNDS_META: PolicyMeta = { version: '1.1', effective: '2026-07-24' };
