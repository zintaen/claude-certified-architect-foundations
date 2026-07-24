/**
 * PostHog product-analytics wrapper (OBS-001).
 *
 * Single entry point for posthog-js. Consent-gated via LEGAL-002 consent.ts.
 *
 * Pre-load behaviour: public APIs are synchronous-safe. Before PostHog has loaded,
 * events are DROPPED (not queued) — documented choice to avoid retaining PII-adjacent
 * props in memory and to keep first-paint free of analytics work. After load + consent,
 * track() forwards immediately.
 *
 * question_answered sampling: default 1-in-5 (QUESTION_ANSWERED_SAMPLE_RATE = 0.2).
 * A 100-question sitting therefore emits at most ~20 raw question_answered events.
 */

import { getConsent, onConsentChange, type ConsentState } from '@/lib/consent';

export type AnalyticsEvent =
  | { name: 'exam_started'; props: { mode: 'exam' | 'practice'; question_count: number } }
  | { name: 'exam_submitted'; props: { duration_s: number; answered: number } }
  | { name: 'exam_graded'; props: { score_pct: number; passed: boolean } }
  | { name: 'practice_started'; props: { domain: string | null } }
  | { name: 'question_answered'; props: { domain: string; correct: boolean } }
  | { name: 'flashcards_started'; props: { deck: string } }
  | { name: 'result_viewed'; props: { passed: boolean } }
  | {
      name: 'subscribe_submitted';
      props: { source: 'post_result' | 'footer' | 'dashboard' };
    }
  | { name: 'donate_clicked'; props: { placement: string } }
  | {
      name: 'upgrade_prompt_shown';
      props: {
        reason: 'cap_reached' | 'mock_limit' | 'explanations_locked';
        exam_code: string | null;
      };
    }
  | {
      name: 'upgrade_prompt_clicked';
      props: {
        reason: 'cap_reached' | 'mock_limit' | 'explanations_locked';
        exam_code: string | null;
      };
    }
  | {
      name: 'entitlement_gate_hit';
      props: {
        gate: 'free_mock_limit' | 'free_cap' | 'explanations';
        exam_code: string | null;
      };
    }
  | {
      name: 'tutor_opened';
      props: { surface: 'result' | 'practice_review' | 'drill'; exam_code: string | null };
    }
  | {
      name: 'tutor_question_asked';
      props: {
        intent: 'explain_concept' | 'why_wrong' | 'walk_through' | 'related_concept';
        exam_code: string | null;
      };
    }
  | {
      name: 'tutor_capped';
      props: {
        level: 'user_daily' | 'global_breaker' | 'abuse_cooldown' | 'ledger_error';
        exam_code: string | null;
      };
    }
  | {
      name: 'pseo_page_viewed';
      props: {
        exam_code: string;
        intent: 'practice-exam' | 'practice-questions' | 'free-mock-test';
      };
    }
  | {
      name: 'pseo_free_item_answered';
      props: {
        exam_code: string;
        intent: 'practice-exam' | 'practice-questions' | 'free-mock-test';
      };
    }
  | { name: 'referral_link_shared'; props: { code_hash: string } }
  | { name: 'referral_signup'; props: { code_hash: string } }
  | { name: 'referral_qualified'; props: { code_hash: string } }
  | { name: 'community_explanation_submitted'; props: { item_id_hash: string } }
  | { name: 'community_explanation_approved'; props: { item_id_hash: string } }
  | { name: 'community_explanation_flagged'; props: { item_id_hash: string } }
  | { name: 'email_sent'; props: { template: string; sequence: string; recipient_hash: string } }
  | { name: 'email_unsubscribed'; props: { recipient_hash: string } }
  | {
      name: 'readiness_viewed';
      props: { exam_code: string; band: 'building' | 'approaching' | 'ready' | null };
    }
  | {
      name: 'readiness_locked_viewed';
      props: { exam_code: string; band: null };
    }
  | {
      name: 'drill_started';
      props: { exam_code: string; length: number; domains: string };
    }
  | { name: 'drill_completed'; props: { exam_code: string } }
  | { name: 'review_session_started'; props: { due_count: number } }
  | { name: 'review_card_graded'; props: { kind: string; grade: string } }
  | { name: 'review_session_completed'; props: { due_count: number } }
  | {
      name: 'plan_created';
      props: { weeks: number; hours_per_week: number; trigger: string };
    }
  | {
      name: 'plan_replanned';
      props: { weeks: number; hours_per_week: number; trigger: string };
    }
  | { name: 'plan_week_completed'; props: { week_index: number } }
  | {
      name: 'custom_exam_built';
      props: {
        domains_count: number;
        question_count: number;
        timing: string;
        band: string;
      };
    }
  | { name: 'pwa_installed'; props: Record<string, never> }
  | { name: 'offline_practice_used'; props: { exam_code: string | null } }
  | { name: 'offline_sync_completed'; props: { synced: number } }
  | {
      name: 'checkout_opened';
      props: { sku: string; tier: string; exam_code: string | null };
    }
  | {
      name: 'checkout_completed';
      props: { sku: string; tier: string; exam_code: string | null };
    }
  | {
      name: 'purchase_fulfilled';
      props: { sku: string; tier: string; exam_code: string | null };
    };

export const ANALYTICS_EVENT_NAMES = [
  'exam_started',
  'exam_submitted',
  'exam_graded',
  'practice_started',
  'question_answered',
  'flashcards_started',
  'result_viewed',
  'subscribe_submitted',
  'donate_clicked',
  'upgrade_prompt_shown',
  'upgrade_prompt_clicked',
  'entitlement_gate_hit',
  'tutor_opened',
  'tutor_question_asked',
  'tutor_capped',
  'pseo_page_viewed',
  'pseo_free_item_answered',
  'referral_link_shared',
  'referral_signup',
  'referral_qualified',
  'community_explanation_submitted',
  'community_explanation_approved',
  'community_explanation_flagged',
  'email_sent',
  'email_unsubscribed',
  'readiness_viewed',
  'readiness_locked_viewed',
  'drill_started',
  'drill_completed',
  'review_session_started',
  'review_card_graded',
  'review_session_completed',
  'plan_created',
  'plan_replanned',
  'plan_week_completed',
  'custom_exam_built',
  'pwa_installed',
  'offline_practice_used',
  'offline_sync_completed',
  'checkout_opened',
  'checkout_completed',
  'purchase_fulfilled',
] as const;

/** Fraction of question_answered events forwarded (1-in-5). AC 11 budget = 100 * rate. */
export const QUESTION_ANSWERED_SAMPLE_RATE = 0.2;
export const QUESTION_ANSWERED_BUDGET_PER_100 = Math.ceil(100 * QUESTION_ANSWERED_SAMPLE_RATE);

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  opt_out_capturing: () => void;
  opt_in_capturing: () => void;
  reset: () => void;
  shutdown?: () => void;
};

let client: PostHogLike | null = null;
let initPromise: Promise<void> | null = null;
let unsubscribeConsent: (() => void) | null = null;
let questionAnsweredSeen = 0;
let questionAnsweredSent = 0;

function posthogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
}

function posthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

/** Env allows capture when key is set. Real SDK load is skipped under vitest. */
export function envAllowsAnalytics(): boolean {
  return Boolean(posthogKey());
}

function skipRealSdk(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

function clearPostHogStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('ph_') || k.startsWith('phc_'))) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name && (name.startsWith('ph_') || name.startsWith('phc_'))) {
        document.cookie = `${name}=; Max-Age=0; Path=/`;
      }
    });
  } catch {
    /* ignore */
  }
}

async function loadPostHog(): Promise<PostHogLike | null> {
  const key = posthogKey();
  if (!key || typeof window === 'undefined' || skipRealSdk()) return null;
  try {
    const mod = await import('posthog-js');
    const posthog = mod.default;
    posthog.init(key, {
      api_host: posthogHost(),
      capture_pageview: false,
      capture_pageleave: false,
      persistence: 'localStorage+cookie',
      loaded: () => {
        /* noop */
      },
    });
    return posthog as unknown as PostHogLike;
  } catch {
    return null;
  }
}

async function activate(): Promise<void> {
  if (!envAllowsAnalytics()) return;
  if (typeof window === 'undefined') return;
  if (!getConsent().analytics) return;
  if (client) {
    try {
      client.opt_in_capturing();
    } catch {
      /* ignore */
    }
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const ph = await loadPostHog();
      if (!ph) return;
      if (!getConsent().analytics) {
        try {
          ph.opt_out_capturing();
        } catch {
          /* ignore */
        }
        clearPostHogStorage();
        return;
      }
      client = ph;
    })().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

function deactivate(): void {
  if (client) {
    try {
      client.opt_out_capturing();
      client.reset();
    } catch {
      /* ignore */
    }
  }
  client = null;
  clearPostHogStorage();
}

function onConsent(state: ConsentState): void {
  if (state.analytics && envAllowsAnalytics()) {
    void activate();
  } else {
    deactivate();
  }
}

/** Mount once from AnalyticsProvider after hydration. */
export function startAnalyticsRuntime(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (unsubscribeConsent) return unsubscribeConsent;
  onConsent(getConsent());
  unsubscribeConsent = onConsentChange(onConsent);
  return () => {
    unsubscribeConsent?.();
    unsubscribeConsent = null;
  };
}

export function analyticsActive(): boolean {
  return Boolean(client && getConsent().analytics && envAllowsAnalytics());
}

export function track<E extends AnalyticsEvent['name']>(
  name: E,
  props: Extract<AnalyticsEvent, { name: E }>['props']
): void {
  try {
    if (!envAllowsAnalytics() || !getConsent().analytics || !client) return;

    if (name === 'question_answered') {
      questionAnsweredSeen += 1;
      // Deterministic 1-in-5: send when index % 5 === 1 (first of each quintile).
      if ((questionAnsweredSeen - 1) % Math.round(1 / QUESTION_ANSWERED_SAMPLE_RATE) !== 0) {
        return;
      }
      questionAnsweredSent += 1;
    }

    client.capture(name, {
      ...(props as Record<string, unknown>),
      locale: resolveLocaleDimension(),
    });
  } catch {
    // Analytics must never break the product.
  }
}

/** SCALE-001: locale dimension on all product events. */
export function resolveLocaleDimension(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const seg = window.location.pathname.split('/').filter(Boolean)[0];
    if (seg === 'vi') return 'vi';
    const stored = window.localStorage.getItem('cyberskill.locale.preferred');
    if (stored === 'vi' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

/** Test/helpers: reset sampling counters. */
export function __resetQuestionAnsweredSampling(): void {
  questionAnsweredSeen = 0;
  questionAnsweredSent = 0;
}

export function __questionAnsweredSentCount(): number {
  return questionAnsweredSent;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function identifyByEmail(email: string): void {
  try {
    if (!envAllowsAnalytics() || !getConsent().analytics || !client) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    void sha256Hex(normalized).then((hex) => {
      try {
        client?.identify(hex);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

/** CONTENT-003 compatibility — maps funnel helpers onto the typed taxonomy. */
export type FunnelEvent =
  | 'exam_started'
  | 'exam_submitted'
  | 'exam_graded'
  | 'practice_started'
  | 'result_viewed';

export type FunnelProps = {
  exam_code: string;
  question_count?: number;
  score_pct?: number;
  passed?: boolean;
  domain?: string | null;
  duration_s?: number;
  answered?: number;
  [key: string]: string | number | boolean | null | undefined;
};

export function trackFunnel(event: FunnelEvent, props: FunnelProps): void {
  switch (event) {
    case 'exam_started':
      track('exam_started', {
        mode: 'exam',
        question_count: Number(props.question_count) || 0,
      });
      break;
    case 'practice_started':
      track('practice_started', { domain: props.domain ?? null });
      break;
    case 'exam_submitted':
      track('exam_submitted', {
        duration_s: Number(props.duration_s) || 0,
        answered: Number(props.answered) || 0,
      });
      break;
    case 'exam_graded':
      track('exam_graded', {
        score_pct: Number(props.score_pct) || 0,
        passed: Boolean(props.passed),
      });
      break;
    case 'result_viewed':
      track('result_viewed', { passed: Boolean(props.passed) });
      break;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
    }
  }
}

/** Inject a mock client (unit tests). */
export function __setAnalyticsClientForTests(mock: PostHogLike | null): void {
  client = mock;
}
