'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';

/** Dashboard share surface for GROWTH-003. */
export function ReferralShareCard() {
  const [code, setCode] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [counts, setCounts] = useState({ invited: 0, qualified: 0, rewarded: 0 });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!email || !pinHash) return;
      const q = new URLSearchParams({ email, pinHash });
      void fetch(`/api/referrals?${q}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.code) {
            setCode(data.code);
            setShare(data.shareUrl);
            setCounts({
              invited: data.invited ?? 0,
              qualified: data.qualified ?? 0,
              rewarded: data.rewarded ?? 0,
            });
          }
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);

  if (!code || !share) {
    return (
      <section className="rounded-lg border border-foreground/15 p-4 text-sm text-foreground/70">
        Save an email + PIN to get your referral link. Rewards are premium access days (no cash) —
        they apply when entitlements enforcement is on. Qualification requires the friend&apos;s
        first completed mock.
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-foreground/15 bg-foreground/[0.03] p-4 space-y-3"
      data-testid="referral-share"
    >
      <h2 className="font-semibold">Invite a study buddy</h2>
      <p className="text-sm text-foreground/70">
        Share your link. When they finish their first mock, you both can earn premium days (caps
        apply; no cash value). Abuse forfeits rewards.{' '}
        <Link href="/refunds" className="underline underline-offset-2">
          Program terms
        </Link>
        .
      </p>
      <code className="block break-all rounded bg-background px-2 py-1 text-xs">{share}</code>
      <button
        type="button"
        className="text-sm text-primary underline-offset-2 hover:underline"
        onClick={() => {
          void navigator.clipboard?.writeText(share);
          track('referral_link_shared', { code_hash: code.slice(0, 8) });
          setMsg('Copied.');
        }}
      >
        Copy link
      </button>
      {msg && <p className="text-xs text-foreground/60">{msg}</p>}
      <ul className="text-xs text-foreground/60 flex gap-4">
        <li>Invited: {counts.invited}</li>
        <li>Qualified: {counts.qualified}</li>
        <li>Rewarded: {counts.rewarded}</li>
      </ul>
    </section>
  );
}
