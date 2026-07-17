'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore, type GradedResult } from '@/store/examStore';
import { CheckCircle2, XCircle, ArrowLeft, Share2, Swords, Award, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import DonateButton from '@/components/DonateButton';
import DomainBreakdown from '@/components/DomainBreakdown';
import Certificate from '@/components/Certificate';
import { archetypeFor } from '@/lib/domains';
import { track } from '@/lib/track';
import { getServerResult } from '@/lib/serverResults';

export default function ResultPage() {
  const store = useExamStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  // A specific past attempt to view, from /result?s=<sessionId>. Read from the URL after mount
  // (rather than useSearchParams) to stay SSR-safe and avoid a Suspense boundary.
  const [viewedId, setViewedId] = useState<string | null>(null);
  const [viewChecked, setViewChecked] = useState(false);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s');
    setViewedId(s && s.trim() ? s.trim() : null);
    setViewChecked(true);
  }, []);

  // A server-stored breakdown fetched for a history link not held on this device (cross-device).
  const [remote, setRemote] = useState<{ breakdown: GradedResult; completedAt: number } | null>(
    null
  );
  const [remoteChecked, setRemoteChecked] = useState(false);

  // zustand persist may finish rehydrating from localStorage AFTER this component mounts. Decide
  // whether to redirect only once hydration is done - otherwise a cold load of /result (refresh,
  // shared link, restored tab) bounces the user home before the finished session is restored.
  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    if (useExamStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const isHistoryView = viewChecked && viewedId !== null;
  const archived = isHistoryView
    ? store.resultsArchive.find((a) => a.sessionId === viewedId)
    : undefined;
  // In history view render the archived breakdown, then fall back to the server copy (so it opens on
  // any device); otherwise render the live/last graded result.
  const result = isHistoryView ? (archived?.result ?? remote?.breakdown ?? null) : store.result;
  const completedAt = isHistoryView
    ? (archived?.completedAt ?? remote?.completedAt ?? 0)
    : store.completedAt;
  const sessionIdShown = isHistoryView ? (viewedId ?? '') : store.sessionId;

  // Only the live view redirects home when there is no finished sitting. The history view shows a
  // loading then a not-found state below instead of redirecting.
  useEffect(() => {
    if (!hydrated || !viewChecked) return;
    if (isHistoryView) return;
    if (!store.finished || !store.result) router.push('/');
  }, [hydrated, viewChecked, isHistoryView, store.finished, store.result, router]);

  // When the requested breakdown is not in the device-local archive, fetch it from the server
  // (identified users only). This is what lets a breakdown open on another device.
  useEffect(() => {
    if (!hydrated || !viewChecked || !isHistoryView || archived) return;
    let cancelled = false;
    setRemoteChecked(false);
    getServerResult(viewedId as string).then((r) => {
      if (cancelled) return;
      setRemote(r);
      setRemoteChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, viewChecked, isHistoryView, archived, viewedId]);

  // Nickname lives in localStorage; read it after mount to stay SSR-safe.
  const [nickname, setNickname] = useState<string | undefined>(undefined);
  // A stable "now" captured once at mount, used only as a fallback for the certificate date when a
  // completion timestamp is missing. Calling Date.now() directly in render is impure.
  const [fallbackNow] = useState(() => Date.now());
  useEffect(() => {
    setNickname(localStorage.getItem('ccaf-nickname') || undefined);
  }, []);

  if (!hydrated || !viewChecked) return null;

  // History view with no local copy: show a light loading state while the server is checked, then a
  // not-found state if it has nothing (guest, wrong PIN, or a breakdown that was never saved).
  if (isHistoryView && !archived && !remote) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>
        {!remoteChecked ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-foreground/60">
            Loading your breakdown...
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl text-center flex flex-col gap-3">
            <h1 className="text-xl font-bold">Breakdown not found</h1>
            <p className="text-foreground/70">
              To reopen a past breakdown on a new device, use the same email and PIN you entered
              when you took the exam. Your score and stats are always on your dashboard.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!result) return null;

  const domainScores = result.domainScores;
  const shareText = `I scored ${result.score}/1000 on the Claude Certified Architect mock exam!`;
  // Share a public /score link, not /result: it carries the score in the URL so the social
  // preview (generated by /api/og) shows the number and pulls viewers back to the mock.
  const buildShareUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      score: String(result.score),
      passed: result.passed ? '1' : '0',
      archetype: archetypeFor(domainScores),
      nickname: nickname || '',
    });
    return `${origin}/score?${params.toString()}`;
  };
  // Copy a link with a graceful fallback: navigator.clipboard is undefined on insecure origins and
  // can reject when permission is denied, so never assume it exists or that it succeeded.
  const copyLink = async (text: string, okMsg: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(okMsg);
        return;
      }
    } catch {
      /* fall through to the manual copy prompt */
    }
    if (typeof window !== 'undefined') window.prompt('Copy this link:', text);
  };
  const handleChallenge = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?ref=challenge`;
    track('challenge_shared');
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: 'Beat my Claude Architect mock score', text: shareText, url })
        .catch(() => {
          /* user dismissed the share sheet */
        });
      return;
    }
    void copyLink(`Think you can beat my score? ${url}`, 'Challenge link copied to clipboard!');
  };
  const handleShare = () => {
    track('result_shared');
    const url = buildShareUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: 'Claude Certified Architect mock exam', text: shareText, url })
        .catch(() => {
          /* user dismissed the share sheet */
        });
      return;
    }
    void copyLink(`${shareText} ${url}`, 'Share link copied to clipboard!');
  };

  return (
    <div className="flex-1 max-w-4xl w-full min-w-0 mx-auto p-4 sm:p-6 md:p-12 flex flex-col gap-6 sm:gap-8 overflow-x-clip">
      <button
        type="button"
        onClick={() => router.push(isHistoryView ? '/dashboard' : '/')}
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> {isHistoryView ? 'Back to dashboard' : 'Back to Home'}
      </button>

      <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between w-full min-w-0">
        <div className="min-w-0">
          {isHistoryView && (
            <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              Past attempt
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">Exam Results</h1>
          <p className="text-foreground/60 mt-1 text-sm break-all">Session ID: {sessionIdShown}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleShare}
            className="glass-panel min-h-11 px-4 py-2.5 flex items-center justify-center gap-2 rounded-md hover:border-primary/50 transition-colors flex-1 sm:flex-initial"
          >
            <Share2 className="w-4 h-4 shrink-0" /> Share
          </button>
          <button
            type="button"
            onClick={handleChallenge}
            aria-label="Challenge a friend"
            className="glass-panel min-h-11 px-4 py-2.5 flex items-center justify-center gap-2 rounded-md hover:border-primary/50 transition-colors flex-1 sm:flex-initial"
          >
            <Swords className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden" aria-hidden="true">
              Challenge
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              Challenge a friend
            </span>
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-panel p-5 sm:p-8 rounded-2xl border-t-4 ${result.passed ? 'border-t-success' : 'border-t-destructive'} flex flex-col md:flex-row items-center gap-6 sm:gap-8 min-w-0 w-full`}
      >
        <div className="flex-1 flex flex-col items-center md:items-start min-w-0 w-full">
          <div
            className={`text-xs sm:text-sm font-bold uppercase tracking-widest text-center md:text-left ${result.passed ? 'text-success' : 'text-destructive'}`}
          >
            {result.passed ? '✓ Passed (Mock Threshold)' : '✗ Below Threshold'}
          </div>
          <div className="text-5xl sm:text-6xl font-bold mt-2 font-mono tracking-tight">
            {result.score} <span className="text-xl sm:text-2xl text-foreground/40">/ 1000</span>
          </div>
          {domainScores.length > 0 && (
            <div className="mt-3 surface-raised border border-border text-primary text-xs font-medium px-3 py-1 rounded-full">
              Archetype: {archetypeFor(domainScores)}
            </div>
          )}
          <p className="text-foreground/70 mt-4 text-center md:text-left max-w-sm">
            {result.passed
              ? "Excellent work! You've demonstrated a solid understanding of the architect blueprint."
              : 'Keep practicing. Review the explanations below to identify your weak spots.'}
          </p>
          <div className="mt-5">
            <Certificate
              nickname={nickname}
              score={result.score}
              passed={result.passed}
              dateISO={new Date(completedAt || fallbackNow).toISOString()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <CheckCircle2 className="w-6 h-6 text-success mb-1" />
            <div className="text-2xl font-bold">{result.correct}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Correct</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <XCircle className="w-6 h-6 text-destructive mb-1" />
            <div className="text-2xl font-bold">{result.incorrect}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Incorrect</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <div className="w-6 h-6 rounded-full border-2 border-foreground/30 flex items-center justify-center text-xs mb-1 font-bold">
              -
            </div>
            <div className="text-2xl font-bold">{result.skipped}</div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Skipped</div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 items-center justify-center bg-[var(--overlay-subtle)]">
            <Clock className="w-6 h-6 text-primary mb-1" />
            <div className="text-2xl font-bold">{Math.floor(result.timeSec / 60)}m</div>
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

      {/* Work-with-CyberSkill prompt - the highest-intent moment to introduce the studio. */}
      <div className="rounded-2xl border border-primary/30 bg-[var(--overlay-subtle)] p-5 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between min-w-0">
        <div className="text-center sm:text-left min-w-0">
          <h3 className="font-bold">Building with Claude?</h3>
          <p className="text-sm text-muted">
            CyberSkill designs and ships Claude-powered agents for teams. This mock is one of our
            free resources.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
          <a
            href="https://cyberskill.world"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('cta_cyberskill', { action: 'work' })}
            className="bg-primary text-primary-foreground min-h-11 px-4 py-2.5 rounded-md font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center"
          >
            See our work
          </a>
          <a
            href="mailto:info@cyberskill.world?subject=Working%20with%20CyberSkill"
            onClick={() => track('cta_cyberskill', { action: 'talk' })}
            className="surface-raised border border-border min-h-11 px-4 py-2.5 rounded-md font-semibold hover:border-ring transition-colors inline-flex items-center justify-center"
          >
            Talk to us
          </a>
        </div>
      </div>

      {/* Per-domain performance */}
      <DomainBreakdown scores={domainScores} />

      {/* Question Review Section */}
      <div className="flex flex-col gap-6 mt-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Review Questions
        </h2>

        {!result.reviewEnabled ? (
          <div className="glass-panel p-6 rounded-xl border-destructive/30 bg-destructive/5">
            <h3 className="text-destructive font-bold mb-2">Review Locked</h3>
            <p className="text-foreground/80">{result.reviewLockReason}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {result.items.map((it, i) => {
              const chosen = it.options.find((o) => o.letter === it.chosenLetter);
              const isCorrect = chosen?.correct;

              return (
                <div
                  key={it.id}
                  className="glass-panel p-4 sm:p-6 rounded-xl flex flex-col gap-4 min-w-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
                    <div className="font-bold shrink-0">Question {i + 1}</div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
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
                    className="text-base sm:text-lg break-words"
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
                          className={`p-3 sm:p-4 rounded-xl border ${bgClass} flex flex-col gap-2 min-w-0`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
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

                          {opt.explain && (
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
