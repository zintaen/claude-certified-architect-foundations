'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import type { TutorIntent } from '@/lib/tutorIntents';
import { TUTOR_INTENT_LABELS, TUTOR_INTENTS_CLIENT } from '@/lib/tutorIntents';

type Props = {
  /** Post-grade / post-answer surfaces only — never mid timed exam. */
  surface: 'result' | 'practice_review' | 'drill';
  sittingId: string;
  itemId: string | null;
  examCode?: string;
  /** When true, panel must not render (exam integrity). */
  examInProgress?: boolean;
  email?: string | null;
  pinHash?: string | null;
};

/**
 * Premium tutor panel (AI-001). Closed intent set; never sends free-text into
 * analytics. Kill switch / caps degrade honestly.
 */
export function TutorPanel({
  surface,
  sittingId,
  itemId,
  examCode = 'ccaf',
  examInProgress = false,
  email,
  pinHash,
}: Props) {
  const [intent, setIntent] = useState<TutorIntent>('explain_concept');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (examInProgress || !itemId) return;
    track('tutor_opened', { surface, exam_code: examCode });
  }, [surface, examCode, examInProgress, itemId]);

  if (examInProgress || !itemId) return null;

  async function ask() {
    setBusy(true);
    setAnswer(null);
    setMeta(null);
    track('tutor_question_asked', { intent, exam_code: examCode });
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sittingId,
          itemId,
          intent,
          question: question.trim() || undefined,
          phase: surface === 'result' ? 'post_grade' : 'pre_grade',
          examCode,
          examInProgress: false,
          email: email || undefined,
          pinHash: pinHash || undefined,
        }),
      });
      const data = (await res.json()) as {
        degraded?: boolean;
        reason?: string;
        rung?: string;
        answer?: string;
        error?: string;
      };
      if (data.degraded) {
        if (data.reason === 'live_tutor_back_tomorrow' || data.reason === 'abuse_cooldown') {
          track('tutor_capped', {
            level: data.reason === 'abuse_cooldown' ? 'abuse_cooldown' : 'user_daily',
            exam_code: examCode,
          });
        }
        setMeta(
          data.reason === 'tutor_disabled'
            ? 'Live tutor is currently off. Pre-generated explanations still appear in review when available.'
            : data.reason === 'live_tutor_back_tomorrow'
              ? 'Live tutor is back tomorrow — your daily budget is used, or the site-wide cap tripped. Cached and pre-generated help still work when available.'
              : data.reason === 'unavailable_during_exam'
                ? 'The tutor is not available during a timed mock.'
                : `Tutor unavailable (${data.reason || 'unknown'}).`
        );
        setAnswer(null);
      } else if (data.error === 'premium_required') {
        setMeta('Tutor is a premium feature. Unlock a pass to continue.');
      } else if (data.answer) {
        setAnswer(data.answer);
        setMeta(data.rung ? `Served from: ${data.rung}` : null);
      } else {
        setMeta('No answer returned.');
      }
    } catch {
      setMeta('Tutor unavailable right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-6 rounded-lg border border-foreground/15 bg-foreground/[0.03] p-4"
      data-testid="tutor-panel"
      data-surface={surface}
    >
      <h2 className="text-lg font-semibold">AI tutor</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Ask about this item using a fixed intent. Your free-text question is processed by our AI
        provider when live help is needed — see the privacy policy.
      </p>
      <label className="mt-3 block text-sm font-medium">
        Intent
        <select
          className="mt-1 w-full rounded border border-foreground/20 bg-background px-2 py-1.5"
          value={intent}
          onChange={(e) => setIntent(e.target.value as TutorIntent)}
        >
          {TUTOR_INTENTS_CLIENT.map((id) => (
            <option key={id} value={id}>
              {TUTOR_INTENT_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">
        Optional follow-up
        <textarea
          className="mt-1 w-full rounded border border-foreground/20 bg-background px-2 py-1.5 text-sm"
          rows={2}
          maxLength={2000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Optional — leave blank to use pre-generated rationales first"
        />
      </label>
      <button
        type="button"
        className="mt-3 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={() => void ask()}
      >
        {busy ? 'Thinking…' : 'Ask tutor'}
      </button>
      {meta && <p className="mt-3 text-sm text-foreground/70">{meta}</p>}
      {answer && (
        <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-foreground/90">
          {answer}
        </div>
      )}
    </section>
  );
}
