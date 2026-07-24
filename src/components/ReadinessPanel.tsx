'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { DOMAINS, type GroupId, isGroupId } from '@/lib/domains';

type DomainRow = {
  domainKey: string;
  accuracy: number;
  coverage: number;
  recencyWeightedAccuracy: number;
  sampleSize: number;
  sufficient: boolean;
};

type ReadinessPayload = {
  examCode: string;
  score: number | null;
  band: 'building' | 'approaching' | 'ready' | null;
  domains: DomainRow[];
  computedFrom: { responses: number; windowDays: number };
  modelVersion: 1;
};

/**
 * Premium readiness analytics (LEARN-001). Humble claims only.
 * Your practice performance suggests… — never a pass prediction.
 */
export function ReadinessPanel({ examCode = 'ccaf' }: { examCode?: string }) {
  const [data, setData] = useState<ReadinessPayload | null>(null);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!email || !pinHash) {
        setErr('Save email + PIN to load readiness.');
        return;
      }
      const q = new URLSearchParams({ exam: examCode, email, pinHash });
      void fetch(`/api/readiness?${q}`)
        .then(async (r) => {
          if (r.status === 403) {
            setLocked(true);
            track('readiness_locked_viewed', { exam_code: examCode, band: null });
            return null;
          }
          if (!r.ok) throw new Error('load_failed');
          return r.json() as Promise<ReadinessPayload>;
        })
        .then((payload) => {
          if (!payload) return;
          setData(payload);
          track('readiness_viewed', {
            exam_code: examCode,
            band: payload.band,
          });
        })
        .catch(() => setErr('Could not load readiness.'));
    } catch {
      setErr('Could not load readiness.');
    }
  }, [examCode]);

  if (locked) {
    return (
      <section
        className="rounded-lg border border-foreground/15 p-4 space-y-2"
        data-testid="readiness-locked"
      >
        <h2 className="font-semibold">Exam readiness (premium)</h2>
        <p className="text-sm text-foreground/70">
          Your practice performance analytics and readiness band unlock with premium. Basic score
          history on this dashboard stays free.
        </p>
        <Link href="/methodology" className="text-sm underline underline-offset-2">
          How this score works
        </Link>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-lg border border-foreground/15 p-4 text-sm text-foreground/60">
        {err}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-foreground/15 p-4 text-sm text-foreground/60">
        Loading readiness…
      </section>
    );
  }

  const domains = [...data.domains].sort(
    (a, b) => a.recencyWeightedAccuracy * a.coverage - b.recencyWeightedAccuracy * b.coverage
  );

  return (
    <section
      className="rounded-lg border border-foreground/15 bg-foreground/[0.03] p-4 space-y-3"
      data-testid="readiness-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Exam readiness</h2>
        <Link
          href="/methodology"
          className="text-xs underline underline-offset-2 text-foreground/60"
        >
          How this score works
        </Link>
      </div>
      <p className="text-sm text-foreground/70">
        Your practice performance suggests where to focus next. This is guidance from practice data
        — not a prediction about the real exam.
      </p>

      {data.score === null ? (
        <p className="text-sm font-medium" data-testid="readiness-insufficient">
          Not enough data yet ({data.computedFrom.responses} responses in the last{' '}
          {data.computedFrom.windowDays} days). Keep practicing across domains.
        </p>
      ) : (
        <div className="flex gap-4 items-end">
          <div className="text-3xl font-bold tabular-nums">{data.score}</div>
          <div className="text-sm text-foreground/70 capitalize">Band: {data.band}</div>
        </div>
      )}

      <ul className="space-y-2">
        {domains.map((d) => {
          const label = isGroupId(d.domainKey)
            ? DOMAINS[d.domainKey as GroupId].short
            : d.domainKey;
          const pct = Math.round(d.recencyWeightedAccuracy * d.coverage * 100);
          return (
            <li key={d.domainKey} className="text-sm">
              <div className="flex justify-between gap-2 mb-1">
                <span>{label}</span>
                <span className="text-foreground/50">
                  {d.sufficient ? `${pct}%` : 'too few attempts to assess'}
                </span>
              </div>
              <div className="h-2 rounded bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${d.sufficient ? pct : 8}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
