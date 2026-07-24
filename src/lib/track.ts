// Compatibility analytics facade (OBS-001).
// Keeps existing call-site signatures; routes canonical funnel events through
// src/lib/analytics.ts (PostHog + consent) and still fans out to Plausible/Umami
// when those scripts are present (consent-gated by Analytics.tsx).
import { track as phTrack, identifyByEmail, type AnalyticsEvent } from '@/lib/analytics';

type EventProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, options?: { props?: EventProps }) => void;
type UmamiObj = { track?: (event: string, data?: EventProps) => void };
type UmamiFn = (event: string, data?: EventProps) => void;

function fanOutLegacy(event: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as { plausible?: PlausibleFn; umami?: UmamiObj | UmamiFn };

    if (typeof w.plausible === 'function') {
      w.plausible(event, props ? { props } : undefined);
    }

    const u = w.umami;
    if (typeof u === 'function') {
      u(event, props);
    } else if (u && typeof u.track === 'function') {
      u.track(event, props);
    }
  } catch {
    // Analytics must never break the product.
  }
}

/** Map legacy event names onto the typed PostHog taxonomy when possible. */
function routeCanonical(event: string, props?: EventProps): void {
  switch (event) {
    case 'session_started': {
      const mode = String(props?.mode ?? '');
      const count = Number(props?.count) || 0;
      if (mode === 'flashcards') {
        phTrack('flashcards_started', { deck: 'default' });
      } else if (mode === 'practice' || mode === 'drill') {
        phTrack('practice_started', { domain: null });
      } else {
        phTrack('exam_started', { mode: 'exam', question_count: count });
      }
      break;
    }
    case 'exam_graded': {
      phTrack('exam_graded', {
        score_pct: Number(props?.score) || 0,
        passed: Boolean(props?.passed),
      });
      break;
    }
    case 'exam_submitted': {
      phTrack('exam_submitted', {
        duration_s: Number(props?.duration_s) || 0,
        answered: Number(props?.answered) || 0,
      });
      break;
    }
    case 'subscribe_optin':
    case 'subscribe_submitted': {
      const raw = String(props?.source ?? 'dashboard');
      const source: Extract<AnalyticsEvent, { name: 'subscribe_submitted' }>['props']['source'] =
        raw === 'post_result' || raw === 'footer' || raw === 'dashboard' ? raw : 'dashboard';
      phTrack('subscribe_submitted', { source });
      break;
    }
    case 'donate_clicked': {
      phTrack('donate_clicked', { placement: String(props?.placement ?? 'unknown') });
      break;
    }
    case 'result_viewed': {
      phTrack('result_viewed', { passed: Boolean(props?.passed) });
      break;
    }
    case 'question_answered': {
      phTrack('question_answered', {
        domain: String(props?.domain ?? 'unknown'),
        correct: Boolean(props?.correct),
      });
      break;
    }
    case 'practice_started': {
      phTrack('practice_started', {
        domain: props?.domain != null ? String(props.domain) : null,
      });
      break;
    }
    case 'flashcards_started': {
      phTrack('flashcards_started', { deck: String(props?.deck ?? 'default') });
      break;
    }
    case 'exam_started': {
      phTrack('exam_started', {
        mode: props?.mode === 'practice' ? 'practice' : 'exam',
        question_count: Number(props?.question_count ?? props?.count) || 0,
      });
      break;
    }
    default:
      // Non-canonical legacy events (challenge_shared, referred_visit, …) stay Plausible/Umami only.
      break;
  }
}

export function track(event: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  routeCanonical(event, props);
  fanOutLegacy(event, props);
}

export { identifyByEmail };
