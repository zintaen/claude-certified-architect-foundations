'use client';

import { useEffect, useState } from 'react';
import { isPwaEnabledFromEnv } from '@/sw';
import { scheduleIdlePrefetch, syncPending } from '@/lib/offline';
import { track } from '@/lib/analytics';
import { analyticsAllowed } from '@/lib/consent';

/**
 * Registers the SCALE-002 service worker when PWA is enabled.
 * When disabled, unregisters any existing worker and asks it to purge caches.
 */
export default function PwaRegister() {
  const [enabled] = useState(() => isPwaEnabledFromEnv());

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    async function run() {
      if (!enabled) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          reg.active?.postMessage({ type: 'PURGE_AND_UNREGISTER' });
          await reg.unregister();
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        return;
      }

      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        /* ignore */
      }

      if (cancelled) return;
      scheduleIdlePrefetch('ccaf');

      const onOnline = () => {
        void syncPending();
      };
      window.addEventListener('online', onOnline);

      const onInstalled = () => {
        if (analyticsAllowed()) track('pwa_installed', {});
      };
      window.addEventListener('appinstalled', onInstalled);

      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    let cleanup: (() => void) | undefined;
    void run().then((c) => {
      cleanup = c;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);

  return null;
}
