'use client';

import { motion } from 'framer-motion';
import { weakestDomain, type DomainScore } from '@/lib/domains';

// Map a 0-100 percentage to a CDS band color. Both classes use design tokens so
// the fill reads correctly in light and dark themes.
function bandClass(pct: number): string {
  if (pct >= 70) return 'bg-success';
  if (pct >= 40) return 'bg-gold';
  return 'bg-destructive';
}

export default function DomainBreakdown({ scores }: { scores: DomainScore[] }) {
  if (scores.length === 0) return null;
  const weakest = weakestDomain(scores);

  return (
    <div className="surface-panel rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-xl font-bold">Performance by domain</h2>

      <div className="flex flex-col gap-4">
        {scores.map((d) => (
          <div key={d.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{d.label}</span>
              <span className="text-muted font-mono shrink-0">
                {d.correct}/{d.total} ({d.pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[var(--overlay-strong)] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${bandClass(d.pct)}`}
                initial={{ width: 0 }}
                animate={{ width: `${d.pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {weakest && <p className="text-sm text-muted">Focus next on {weakest.label}.</p>}
    </div>
  );
}
