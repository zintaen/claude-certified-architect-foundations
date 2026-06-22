// Lightweight, provider-agnostic analytics events. Fires to Plausible and/or Umami if either is
// present on the page (both are loaded by src/components/Analytics.tsx only when their env vars are
// set), and no-ops otherwise. Safe to call from any client component - it never throws and never
// blocks. Once an analytics provider is enabled, these events make the funnel visible:
// session_started -> exam_graded -> result_shared / subscribe_optin / cta_cyberskill, plus
// challenge_shared and referred_visit for the referral loop.
type EventProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, options?: { props?: EventProps }) => void;
type UmamiObj = { track?: (event: string, data?: EventProps) => void };
type UmamiFn = (event: string, data?: EventProps) => void;

export function track(event: string, props?: EventProps): void {
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
