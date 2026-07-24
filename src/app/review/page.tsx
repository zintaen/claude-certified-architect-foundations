'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { questions } from '@/data/questions';

type CardView = {
  id: string;
  cardKind: 'item' | 'flashcard';
  cardRef: string;
  dueAt: string;
  state: string;
};

/**
 * Daily SRS review queue (LEARN-003). Premium when entitlements enforced.
 */
export default function ReviewPage() {
  const [due, setDue] = useState<CardView[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const identity = useCallback(() => {
    try {
      return {
        email: localStorage.getItem('ccaf-email'),
        pinHash: localStorage.getItem('ccaf-pinHash'),
      };
    } catch {
      return { email: null, pinHash: null };
    }
  }, []);

  const load = useCallback(() => {
    const { email, pinHash } = identity();
    if (!email || !pinHash) {
      setMsg('Save email + PIN to sync review cards.');
      return;
    }
    const tzOffset = new Date().getTimezoneOffset();
    const q = new URLSearchParams({
      email,
      pinHash,
      exam: 'ccaf',
      tzOffset: String(tzOffset),
    });
    void fetch(`/api/review?${q}`)
      .then(async (r) => {
        if (r.status === 403) {
          setLocked(true);
          return null;
        }
        if (!r.ok) throw new Error('fail');
        return r.json() as Promise<{ due: CardView[]; dueCount: number }>;
      })
      .then((data) => {
        if (!data) return;
        setDue(data.due);
        setDueCount(data.dueCount);
        setIdx(0);
        setRevealed(false);
        track('review_session_started', { due_count: data.dueCount });
      })
      .catch(() => setMsg('Could not load review queue.'));
  }, [identity]);

  useEffect(() => {
    load();
  }, [load]);

  async function grade(g: 'again' | 'hard' | 'good' | 'easy') {
    const card = due[idx];
    if (!card) return;
    const { email, pinHash } = identity();
    if (!email || !pinHash) return;
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'grade', cardId: card.id, grade: g, email, pinHash }),
    });
    track('review_card_graded', { kind: card.cardKind, grade: g });
    const nextIdx = idx + 1;
    if (nextIdx >= due.length) {
      track('review_session_completed', { due_count: dueCount });
      setMsg('Session complete for today.');
      setDue([]);
    } else {
      setIdx(nextIdx);
      setRevealed(false);
    }
  }

  if (locked) {
    return (
      <main className="max-w-xl mx-auto p-8 space-y-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-foreground/70">
          Spaced-repetition review is a premium habit loop. Wrong answers still accrue cards so an
          upgrade already has history waiting.
        </p>
        <Link href="/practice" className="underline">
          Back to practice
        </Link>
      </main>
    );
  }

  const card = due[idx];
  const q = card?.cardKind === 'item' ? questions.find((x) => x.id === card.cardRef) : null;

  return (
    <main className="max-w-xl mx-auto p-8 space-y-6" data-testid="review-queue">
      <div className="flex justify-between items-baseline gap-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <span className="text-sm text-foreground/60">
          {due.length ? `${idx + 1} / ${due.length}` : '0'} due today
          {dueCount > due.length ? ` (${dueCount} total)` : ''}
        </span>
      </div>

      {msg && <p className="text-sm text-foreground/60">{msg}</p>}

      {!card && !msg && (
        <p className="text-foreground/70">
          No cards due right now. Misses from mocks become cards.
        </p>
      )}

      {card && (
        <section className="space-y-4 rounded-xl border border-foreground/15 p-4">
          <p className="text-xs uppercase tracking-wide text-foreground/50">
            {card.cardKind} · {card.state}
          </p>
          {q ? (
            <>
              <p className="text-base leading-relaxed">{q.text.replace(/<[^>]+>/g, '')}</p>
              {!revealed ? (
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => setRevealed(true)}
                >
                  I recalled my answer — grade it
                </button>
              ) : (
                <p className="text-sm text-foreground/60">
                  Grade how well you recalled the right approach (self-check). Open the result
                  archive anytime for full explanations.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">Flashcard key: {card.cardRef}</p>
          )}

          {revealed && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(['again', 'hard', 'good', 'easy'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className="rounded border border-foreground/20 px-3 py-1.5 text-sm capitalize"
                  onClick={() => void grade(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <Link href="/dashboard" className="text-sm underline text-foreground/60">
        Dashboard
      </Link>
    </main>
  );
}
