'use client';

import { useEffect, useState } from 'react';
import { offlineBannerCopy, offlineCapabilities } from '@/lib/offline';

/** Honest offline boundary — copy sourced from offlineCapabilities(). */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  const caps = offlineCapabilities(false);
  const copy = offlineBannerCopy(caps);

  return (
    <div
      className="border-b border-border bg-panel/95 text-sm"
      data-testid="offline-banner"
      role="status"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 space-y-1">
        <p className="font-semibold">{copy.title}</p>
        <p className="text-foreground/80">
          Works: {copy.works.join(' · ')}. Does not: {copy.doesNot.join(', ')}.
        </p>
        <span className="sr-only" data-testid="offline-caps">
          {JSON.stringify(caps)}
        </span>
      </div>
    </div>
  );
}
