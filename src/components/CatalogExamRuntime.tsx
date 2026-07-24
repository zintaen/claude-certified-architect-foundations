'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackFunnel } from '@/lib/analytics';
import IndependenceDisclaimer from '@/components/IndependenceDisclaimer';

type Q = { id: string; domain: string; stem: string; options: { key: string; text: string }[] };

/**
 * Shared catalog exam runtime — same assembly/grade API path as DATA-001.
 * Used by /exams/[code]/practice and /exams/[code]/exam (CONTENT-003 one-engine rule).
 */
export default function CatalogExamRuntime({
  examCode,
  mode,
}: {
  examCode: string;
  mode: 'practice' | 'exam';
}) {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sittingId, setSittingId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score_pct: number; passed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        trackFunnel(mode === 'practice' ? 'practice_started' : 'exam_started', {
          exam_code: examCode,
        });
        const res = await fetch(`/api/exams/${examCode}/session`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'session failed');
        if (cancelled) return;
        setSittingId(data.sittingId);
        setQuestions(data.questions || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examCode, mode]);

  async function submit() {
    if (!sittingId) return;
    trackFunnel('exam_submitted', { exam_code: examCode });
    // Persist answers then grade via existing grade route when available; fallback score local stub
    const gradeRes = await fetch('/api/exam/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sittingId,
        answers: Object.entries(answers).map(([itemId, selectedKey]) => ({
          itemId,
          selectedKey,
        })),
        examCode,
      }),
    });
    if (gradeRes.ok) {
      const g = await gradeRes.json();
      setResult({ score_pct: g.score_pct ?? g.score ?? 0, passed: !!g.passed });
      trackFunnel('exam_graded', { exam_code: examCode });
      trackFunnel('result_viewed', { exam_code: examCode });
      return;
    }
    setResult({ score_pct: 0, passed: false });
    trackFunnel('exam_graded', { exam_code: examCode });
  }

  if (loading) return <p className="p-8 text-muted">Loading {examCode} sitting…</p>;
  if (error) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-danger">{error}</p>
        <p className="text-sm text-muted">
          Local Supabase + seeded catalog required for multi-exam sittings.
        </p>
        <Link href={`/exams/${examCode}`} className="text-primary underline">
          Back to exam landing
        </Link>
      </div>
    );
  }
  if (result) {
    return (
      <div className="max-w-xl mx-auto p-8 space-y-4">
        <h1 className="text-2xl font-bold">
          {examCode.toUpperCase()} — {result.passed ? 'Pass' : 'Review'}
        </h1>
        <p className="text-lg">Score: {result.score_pct}%</p>
        <IndependenceDisclaimer />
        <Link href={`/exams/${examCode}`} className="text-primary underline">
          Back
        </Link>
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return <p className="p-8">No questions available.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-engine="catalog-exam-runtime">
      <header className="flex justify-between items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{examCode}</p>
          <h1 className="text-lg font-semibold">
            {mode === 'exam' ? 'Timed mock' : 'Practice'} · {idx + 1}/{questions.length}
          </h1>
        </div>
        <Link href={`/exams/${examCode}`} className="text-sm text-primary underline">
          Exit
        </Link>
      </header>
      <p className="text-sm text-muted">{q.domain}</p>
      <div className="text-base leading-relaxed whitespace-pre-wrap">{q.stem}</div>
      <div className="space-y-2">
        {q.options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
            className={`w-full text-left border rounded-lg px-4 py-3 min-h-11 transition-colors ${
              answers[q.id] === o.key
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="font-mono text-xs mr-2">{o.key}.</span>
            {o.text}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="px-4 py-2 border border-border rounded-lg disabled:opacity-40"
        >
          Prev
        </button>
        {idx < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setIdx((i) => i + 1)}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Submit
          </button>
        )}
      </div>
      <IndependenceDisclaimer />
    </div>
  );
}
