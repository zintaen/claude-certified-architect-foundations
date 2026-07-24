'use client';

import { useEffect, useState } from 'react';

/** Lightweight non-monetary recognition (GROWTH-004). */
export function CommunityContributionCard() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!email || !pinHash) return;
      const q = new URLSearchParams({ op: 'count', email, pinHash });
      void fetch(`/api/community/explanations?${q}`)
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.approvedCount === 'number') setCount(data.approvedCount);
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);

  if (count === null || count === 0) return null;

  return (
    <p className="text-sm text-foreground/60" data-testid="community-contribution-count">
      Approved community explanations: {count}
    </p>
  );
}
