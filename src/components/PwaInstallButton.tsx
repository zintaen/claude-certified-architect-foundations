'use client';

import { useEffect, useState } from 'react';
import { isPwaEnabledFromEnv } from '@/sw';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Quiet install affordance — never an interstitial. */
export default function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [enabled] = useState(() => isPwaEnabledFromEnv());

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [enabled]);

  if (!enabled || !deferred) return null;

  return (
    <button
      type="button"
      data-testid="pwa-install"
      className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
      onClick={() => {
        void deferred.prompt();
        void deferred.userChoice.finally(() => setDeferred(null));
      }}
    >
      Install app
    </button>
  );
}
