'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsent, setConsent, onConsentChange, type ConsentState } from '@/lib/consent';

/**
 * First-party cookie consent banner (LEGAL-002).
 * Equal-weight accept / reject; does not block reading the page.
 */
export default function CookieConsent() {
  const [state, setState] = useState<ConsentState | null>(null);

  useEffect(() => {
    setState(getConsent());
    return onConsentChange((s) => setState(s));
  }, []);

  if (!state || state.decidedAt !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-panel/95 backdrop-blur-sm p-4 sm:p-5"
      data-testid="cookie-consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/90 leading-relaxed">
          We use essential cookies to run the site. Analytics cookies are optional and off by
          default. See our{' '}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            className="min-h-11 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-foreground/5"
            onClick={() => setConsent(false)}
            data-testid="consent-reject"
          >
            Reject analytics
          </button>
          <button
            type="button"
            className="min-h-11 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-foreground/5"
            onClick={() => setConsent(true)}
            data-testid="consent-accept"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
