'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Dashboard due-count entry for LEARN-003. */
export function ReviewDueBadge() {
  const [count, setCount] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!email || !pinHash) return;
      const tzOffset = new Date().getTimezoneOffset();
      const q = new URLSearchParams({ email, pinHash, tzOffset: String(tzOffset) });
      void fetch(`/api/review?${q}`)
        .then(async (r) => {
          if (r.status === 403) {
            setLocked(true);
            return null;
          }
          if (!r.ok) return null;
          return r.json() as Promise<{ dueCount: number }>;
        })
        .then((data) => {
          if (data && typeof data.dueCount === 'number') setCount(data.dueCount);
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);

  if (locked) {
    return (
      <p className="text-sm text-foreground/60">
        Review queue is premium.{' '}
        <Link href="/review" className="underline">
          Learn more
        </Link>
      </p>
    );
  }
  if (count === null) return null;
  return (
    <p className="text-sm" data-testid="review-due-count">
      <Link href="/review" className="underline underline-offset-2">
        Review due today: {count}
      </Link>
    </p>
  );
}
