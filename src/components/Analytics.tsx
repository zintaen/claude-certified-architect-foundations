'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { analyticsAllowed, onConsentChange } from '@/lib/consent';

/**
 * Analytics scripts gated on consent (LEGAL-002).
 * Nothing loads until analytics is granted.
 */
export default function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(analyticsAllowed());
    return onConsentChange((s) => setAllowed(s.analytics));
  }, []);

  if (!allowed) return null;

  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;

  return (
    <>
      {plausibleDomain ? (
        <Script
          defer
          data-domain={plausibleDomain}
          src={plausibleSrc}
          strategy="afterInteractive"
        />
      ) : null}
      {umamiId && umamiSrc ? (
        <Script defer data-website-id={umamiId} src={umamiSrc} strategy="afterInteractive" />
      ) : null}
    </>
  );
}
