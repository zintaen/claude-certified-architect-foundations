'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/store/examStore';
import { CheckCircle2, XCircle, ArrowLeft, Share2, Award, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import DonateButton from '@/components/DonateButton';

export default function ResultPage() {
  const store = useExamStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  // zustand persist may finish rehydrating from localStorage AFTER this component mounts. Decide
  // whether to redirect only once hydration is done - otherwise a cold load of /result (refresh,
  // shared link, restored tab) bounces the user home before the finished session is restored.
  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    if (useExamStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!store.finished || store.items.length === 0) {
      router.push('/');
    }
  }, [hydrated, store.finished, store.items.length, router]);

  const stats = useMemo(() => {
    if (store.items.length === 0) return null;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    store.items.forEach((it) => {
      if (!it.chosenLetter) {
        skipped++;
        return;
      }
      const chosen = it.options.find((o) => o.letter === it.chosenLetter);
      if (chosen?.correct) correct++;
      else incorrect++;
    });

    const score1000 = Math.round((correct / store.items.length) * 1000);
    const passed = score1000 >= 700;
    const timeSec = Math.max(0, Math.floor((store.endsAt - store.startedAt) / 1000));

    return { correct, incorrect, skipped, score1000, passed, timeSec, total: store.items.length };
  }, [store.items, store.endsAt, store.startedAt]);

  if (!hydrated || !stats) return null;

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exam Results</h1>
          <p className="text-foreground/60 mt-1">Session ID: {store.sessionId}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(
              `I scored ${stats.score1000}/1000 on the Claude Certified Architect mock exam!`
            );
            alert('Copied to clipboard!');
          }}
          className="glass-panel px-4 py-2 flex items-center gap-2 rounded-md hover:border-primary/50 transition-colors"
        >
          <Share2 className="w-4 h-4" /> Share Result
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-panel p-8 rounded-2xl border-t-4 ${stats.passed ? 'border-t-success' : 'border-t-destructive'} flex flex-col md:flex-row items-center gap-8`}
      >
        <div className="flex-1 flex flex-col items-center md:items-start">
          <div
            className={`text-sm font-bold uppercase tracking-widest ${stats.passed ? 'text-success' : 'text-destructive'}`}
          >
            {stats.passed ? '✓ Passed (Mock Threshold)' : '✗ Below Threshold'}
          </div>
          <div className="text-6xl font-bold mt-2 font-mono tracking-tight">
            {stats.score1000} <span className="text-2xl text-foreground/40">/ 1000</span>
          </div>
          <p className="text-foreground/70 mt-4 text-center md:text-left max-w-sm">
            {stats.passed
              ? "Excellent work! You've demonstrated a solid understanding of the architect blueprint."
              : 'Keep practicing. Review the explanations below to identify your weak spots.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <CheckCircle2 className="w-6 h-6 text-success mb-1" />
            <div className="text-2xl font-bold">{stats.correct}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Correct</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <XCircle className="w-6 h-6 text-destructive mb-1" />
            <div className="text-2xl font-bold">{stats.incorrect}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Incorrect</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <div className="w-6 h-6 rounded-full border-2 border-foreground/30 flex items-center justify-center text-xs mb-1 font-bold">
              -
            </div>
            <div className="text-2xl font-bold">{stats.skipped}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Skipped</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <Clock className="w-6 h-6 text-primary mb-1" />
            <div className="text-2xl font-bold">{Math.floor(stats.timeSec / 60)}m</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Time Taken</div>
          </div>
        </div>
      </motion.div>

      {/* Support prompt */}
      <div className="surface-raised border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="text-center sm:text-left">
          <h3 className="font-bold">Found this useful?</h3>
          <p className="text-sm text-muted">
            This mock is free and built by CyberSkill. A coffee keeps it running.
          </p>
        </div>
        <DonateButton variant="solid" className="shrink-0" />
      </div>

      {/* Question Review Section */}
      <div className="flex flex-col gap-6 mt-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Review Questions
        </h2>

        {!store.reviewEnabled ? (
          <div className="glass-panel p-6 rounded-xl border-destructive/30 bg-destructive/5">
            <h3 className="text-destructive font-bold mb-2">Review Locked</h3>
            <p className="text-foreground/80">{store.reviewLockReason}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {store.items.map((it, i) => {
              const chosen = it.options.find((o) => o.letter === it.chosenLetter);
              const isCorrect = chosen?.correct;

              return (
                <div key={it.id} className="glass-panel p-6 rounded-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="font-bold">Question {i + 1}</div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        !it.chosenLetter
                          ? 'bg-foreground/10 text-foreground/60'
                          : isCorrect
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {!it.chosenLetter ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                  </div>

                  <div
                    className="text-lg"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(it.text) }}
                  />

                  <div className="flex flex-col gap-3 mt-4">
                    {it.options.map((opt) => {
                      const isChosen = it.chosenLetter === opt.letter;
                      const isThisCorrect = opt.correct;

                      let bgClass = 'bg-[var(--overlay-subtle)] border-border';
                      if (isThisCorrect)
                        bgClass =
                          'bg-success/10 border-success/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
                      else if (isChosen && !isThisCorrect)
                        bgClass = 'bg-destructive/10 border-destructive/50';

                      return (
                        <div
                          key={opt.letter}
                          className={`p-4 rounded-xl border ${bgClass} flex flex-col gap-2`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold ${
                                isThisCorrect
                                  ? 'bg-success text-success-foreground'
                                  : isChosen
                                    ? 'bg-destructive text-destructive-foreground'
                                    : 'bg-[var(--overlay-strong)]'
                              }`}
                            >
                              {opt.letter}
                            </div>
                            <div
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt.text) }}
                            />
                          </div>

                          {store.reviewEnabled && opt.explain && (
                            <div className="mt-3 text-sm text-foreground/70 pl-9 border-l-2 border-border ml-3 py-1">
                              {opt.explain}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
