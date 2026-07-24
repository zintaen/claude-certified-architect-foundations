'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/**
 * Capture ?ref= into sessionStorage (first-party, consent-free attribution).
 * Bind happens when the user has email+PIN via /api/referrals.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref')?.trim();
      if (ref) sessionStorage.setItem('ccaf-ref', ref);

      const code = sessionStorage.getItem('ccaf-ref');
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!code || !email || !pinHash) return;

      void fetch('/api/referrals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'bind', code, email, pinHash }),
      })
        .then(async (r) => {
          if (!r.ok) return;
          const data = (await r.json()) as { result?: string; codeHash?: string };
          if (data.result === 'bound' && data.codeHash) {
            track('referral_signup', { code_hash: data.codeHash });
          }
          sessionStorage.removeItem('ccaf-ref');
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
