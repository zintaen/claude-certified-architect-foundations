'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import type { StudyPlan } from '@/lib/studyPlan';

export default function PlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [locked, setLocked] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState(6);
  const [msg, setMsg] = useState<string | null>(null);

  function identity() {
    try {
      return {
        email: localStorage.getItem('ccaf-email'),
        pinHash: localStorage.getItem('ccaf-pinHash'),
      };
    } catch {
      return { email: null, pinHash: null };
    }
  }

  useEffect(() => {
    const { email, pinHash } = identity();
    if (!email || !pinHash) return;
    const q = new URLSearchParams({ email, pinHash, exam: 'ccaf' });
    void fetch(`/api/plan?${q}`)
      .then(async (r) => {
        if (r.status === 403) {
          setLocked(true);
          return null;
        }
        if (!r.ok) return null;
        return r.json() as Promise<{ plan: StudyPlan | null }>;
      })
      .then((data) => {
        if (data?.plan) setPlan(data.plan);
      })
      .catch(() => undefined);
  }, []);

  async function createPlan(replan = false) {
    const { email, pinHash } = identity();
    if (!email || !pinHash) {
      setMsg('Save email + PIN first.');
      return;
    }
    if (!examDate) {
      setMsg('Pick an exam date.');
      return;
    }
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        pinHash,
        examCode: 'ccaf',
        examDate,
        hoursPerWeek: hours,
        replan,
      }),
    });
    if (res.status === 403) {
      setLocked(true);
      return;
    }
    const data = (await res.json()) as { plan?: StudyPlan };
    if (data.plan) {
      setPlan(data.plan);
      track(replan ? 'plan_replanned' : 'plan_created', {
        weeks: data.plan.weeks.length,
        hours_per_week: hours,
        trigger: replan ? 'manual' : 'create',
      });
    }
  }

  if (locked) {
    return (
      <main className="max-w-xl mx-auto p-8 space-y-4">
        <h1 className="text-2xl font-bold">Study plan</h1>
        <p className="text-foreground/70">
          Personalized week-by-week plans unlock with premium. Templates are pre-authored — no live
          model calls.
        </p>
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6" data-testid="study-plan">
      <h1 className="text-2xl font-bold">Study plan</h1>
      <p className="text-sm text-foreground/70">
        Assembled from your weak domains and a reviewed template library. Not a live AI chat.
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Exam date
          <input
            type="date"
            className="block mt-1 rounded border border-border bg-background px-2 py-1"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Hours / week
          <input
            type="number"
            min={2}
            max={40}
            className="block mt-1 w-20 rounded border border-border bg-background px-2 py-1"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="rounded bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          onClick={() => void createPlan(false)}
        >
          Create plan
        </button>
        {plan && (
          <button
            type="button"
            className="rounded border border-border px-4 py-2 text-sm"
            onClick={() => void createPlan(true)}
          >
            Re-plan
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-foreground/60">{msg}</p>}

      {plan?.honestWarning && (
        <p className="text-sm border border-foreground/20 rounded p-3" data-testid="plan-honesty">
          {plan.honestWarning}
        </p>
      )}

      {plan && (
        <ol className="space-y-3">
          {plan.weeks.map((w) => (
            <li key={w.index} className="rounded border border-foreground/15 p-3 text-sm">
              <div className="font-semibold">
                Week {w.index}: {w.theme}
              </div>
              <ul className="mt-1 text-foreground/70 list-disc pl-5">
                {w.drills.map((d) => (
                  <li key={d.domainKey}>
                    Drill {d.domainKey} ×{d.sessions}
                  </li>
                ))}
                <li>Review sessions: {w.reviewSessions}</li>
                {w.mocks > 0 && <li>Full mocks: {w.mocks}</li>}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <Link href="/dashboard" className="text-sm underline text-foreground/60">
        Dashboard
      </Link>
    </main>
  );
}
