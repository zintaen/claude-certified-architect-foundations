'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useExamStore, type GradedOption } from '@/store/examStore';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Layers, ArrowRight } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

export default function FlashcardsPage() {
  const store = useExamStore();
  const engine = useExamEngine();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  // Answers are fetched from the server (the key is not in the client bundle), keyed by id.
  const [answerMap, setAnswerMap] = useState<Record<string, GradedOption[]>>({});

  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    if (useExamStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Only flashcard sessions belong here; otherwise send people to the picker.
  useEffect(() => {
    if (!hydrated) return;
    if (!store.isFlashcardMode || store.items.length === 0) router.push('/practice');
  }, [hydrated, store.isFlashcardMode, store.items.length, router]);

  // Pull the answer key for this session's questions once, so reveal works without shipping
  // the key in the bundle. Keyed on sessionId so "shuffle and restart" refetches.
  useEffect(() => {
    if (!hydrated || !store.isFlashcardMode) return;
    const ids = useExamStore.getState().items.map((it) => it.id);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        const data = (await res.json()) as { answers?: { id: string; options: GradedOption[] }[] };
        if (cancelled || !data.answers) return;
        const map: Record<string, GradedOption[]> = {};
        for (const a of data.answers) map[a.id] = a.options;
        setAnswerMap(map);
      } catch {
        /* leave answers empty; reveal stays disabled until a successful fetch */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, store.isFlashcardMode, store.sessionId]);

  if (!hydrated || !store.isFlashcardMode || store.items.length === 0) return null;

  const total = store.items.length;
  const current = store.items[store.idx];
  const answers = answerMap[current.id];
  const correctOption = answers?.find((o) => o.correct);

  const rate = (gotIt: boolean) => {
    if (correctOption) {
      store.processFlashcardAnswer(store.idx, current.id, correctOption.letter, gotIt);
    }
    setReviewedCount((n) => n + 1);
    if (store.idx < total - 1) {
      store.setIndex(store.idx + 1);
      setRevealed(false);
    } else {
      setDone(true);
    }
  };

  const restart = () => {
    engine.buildSession(questions, 60, true, { flashcard: true });
    setRevealed(false);
    setDone(false);
    setReviewedCount(0);
  };

  if (done) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-12 flex flex-col items-center text-center gap-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Layers className="w-7 h-7" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          You reviewed {reviewedCount} cards
        </h1>
        <p className="text-muted max-w-md">
          Flashcards do not record a score. When you are ready to test under exam conditions, take
          the timed mock.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={restart}
            className="surface-raised border border-border px-5 py-2.5 rounded-md font-semibold hover:border-ring transition-colors"
          >
            Shuffle and restart
          </button>
          <Link
            href="/practice"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Back to practice <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/practice"
          className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit flashcards
        </Link>
        <div className="text-sm font-mono text-muted">
          Card {store.idx + 1} of {total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[var(--overlay-strong)] overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((store.idx + (revealed ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="surface-panel rounded-2xl p-6 md:p-8 flex flex-col gap-6"
        >
          <div
            className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.text) }}
          />

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              disabled={!answers}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold self-start hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {answers ? 'Reveal answer' : 'Loading answer...'}
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {(answers ?? []).map((opt) => (
                  <div
                    key={opt.letter}
                    className={`p-4 rounded-xl border flex flex-col gap-2 ${
                      opt.correct
                        ? 'bg-success/10 border-success/50'
                        : 'border-border bg-[var(--overlay-subtle)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold ${
                          opt.correct
                            ? 'bg-success text-success-foreground'
                            : 'bg-[var(--overlay-strong)]'
                        }`}
                      >
                        {opt.letter}
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt.text) }} />
                    </div>
                    {opt.explain && <div className="text-sm text-muted pl-9">{opt.explain}</div>}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-muted mr-1">How did you do?</span>
                <button
                  onClick={() => rate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium border border-success/40 text-success hover:bg-success/10 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Got it
                </button>
                <button
                  onClick={() => rate(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium border border-border text-foreground/80 hover:border-ring transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Review again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
