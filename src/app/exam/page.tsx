'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamStore } from '@/store/examStore';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import ThemeToggle from '@/components/ThemeToggle';
import { isIdentified, saveServerSession, beaconSaveServerSession } from '@/lib/serverSession';

export default function ExamPage() {
  const router = useRouter();
  const store = useExamStore();
  const { buildSession, finishExam } = useExamEngine();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [online, setOnline] = useState(true);
  // Scrollable question body — must reset on navigation so Next/palette jumps
  // do not leave the stem scrolled out of the mobile viewport.
  const questionScrollRef = useRef<HTMLDivElement>(null);

  // A single in-flight guard so a double-click on Submit, or a timer expiry that overlaps a slow
  // grade request, cannot fire two grade calls (and two leaderboard writes).
  const submittingRef = useRef(false);
  const submit = useCallback(
    async (force: boolean, timedOut = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      const ok = await finishExam(force, timedOut);
      if (ok) router.push('/result');
      else submittingRef.current = false;
    },
    [finishExam, router]
  );

  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // Track connectivity. The exam itself needs no network (questions are already loaded and answers
  // persist locally), but grading does, so surface the state and let people keep answering offline.
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // Cross-device checkpoint: for identified users only, save a throttled snapshot of the sitting to
  // the server so it can be resumed on another device. localStorage stays the primary, offline path,
  // so this is purely additive and best-effort. Fires on answer/navigation, at most once per window.
  const lastSaveRef = useRef(0);
  useEffect(() => {
    if (!mounted || store.finished || store.items.length === 0 || store.isFlashcardMode) return;
    if (!isIdentified()) return;
    const THROTTLE = 20000;
    const since = Date.now() - lastSaveRef.current;
    if (since >= THROTTLE) {
      lastSaveRef.current = Date.now();
      void saveServerSession();
    } else {
      const t = setTimeout(() => {
        lastSaveRef.current = Date.now();
        void saveServerSession();
      }, THROTTLE - since);
      return () => clearTimeout(t);
    }
  }, [mounted, store.idx, store.items, store.finished, store.isFlashcardMode]);

  // Flush one last checkpoint when the tab is hidden or closed, via sendBeacon so it survives unload.
  useEffect(() => {
    const flush = () => beaconSaveServerSession();
    const onVis = () => {
      if (document.hidden) flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    setMounted(true);
    // Decide ONCE, on mount, whether to start a fresh timed exam: when there is no session yet, or
    // when the persisted one is already finished (opening /exam should not replay an old sitting).
    // This reads a snapshot via getState and must NOT react to `finished`: a reactive dependency
    // would rebuild the session the instant an exam is submitted (finished flips to true here while
    // the page is still mounted), wiping the graded result before /result can read it and bouncing
    // the user home.
    const s = useExamStore.getState();
    if (s.items.length === 0 || s.finished) {
      buildSession(questions, 60, false);
    }
  }, [buildSession]);

  // Timer logic
  const [timeLeft, setTimeLeft] = useState('');
  const [isDanger, setIsDanger] = useState(false);

  useEffect(() => {
    if (!mounted || store.finished || store.untimed) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((store.endsAt - Date.now()) / 1000));
      const m = Math.floor(left / 60);
      const s = left % 60;
      setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsDanger(left <= 300); // red if < 5 mins

      if (left <= 0) {
        clearInterval(interval);
        void submit(true, true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, store.endsAt, store.finished, store.untimed, submit]);

  // Anti-cheat logic
  const [warnings, setWarnings] = useState(0);
  const [cheatWarning, setCheatWarning] = useState(false);

  useEffect(() => {
    if (!mounted || store.finished || store.untimed) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        useExamStore.getState().incrementFocusLoss();
        setWarnings((w) => {
          const newW = w + 1;
          if (newW >= 3) {
            void submit(true, false);
          } else {
            setCheatWarning(true);
          }
          return newW;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mounted, store.finished, store.untimed, submit]);

  // After Next/Previous/palette, pin the question stem back into view on phones.
  useEffect(() => {
    if (!mounted) return;
    const el = questionScrollRef.current;
    if (el) el.scrollTop = 0;
    // Also reset document scroll if something else scrolled the page (safe on mobile Safari).
    window.scrollTo(0, 0);
  }, [mounted, store.idx]);

  if (!mounted || store.items.length === 0) return null;

  const currentQ = store.items[store.idx];
  const isLast = store.idx === store.items.length - 1;
  const isFirst = store.idx === 0;

  const totalAnswered = store.items.filter((i) => i.chosenLetter).length;

  return (
    // Viewport-contained shell: min-h-0 lets flex children shrink so the question body scrolls
    // inside the shell instead of expanding the page and leaving stems off-screen after Next.
    <div className="flex-1 flex flex-col md:flex-row min-h-0 h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] overflow-hidden w-full">
      {/* Sidebar: Navigation Palette — compact strip on mobile, full column on desktop */}
      <aside className="w-full md:w-64 glass-panel border-y-0 border-l-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 sm:gap-4 order-2 md:order-1 max-h-[28vh] md:max-h-none md:h-full shrink-0 min-h-0">
        <div className="flex items-center justify-between pb-2 sm:pb-4 border-b border-border shrink-0">
          <div className="text-sm font-semibold">Questions</div>
          <div className="text-xs text-foreground/60">
            {totalAnswered}/{store.items.length}
          </div>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-4 gap-2 content-start">
          {store.items.map((it, i) => {
            const isCurrent = i === store.idx;
            const isAnswered = !!it.chosenLetter;
            const isFlagged = it.flagged;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => store.setIndex(i)}
                aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}${isCurrent ? ', current' : ''}`}
                className={`
                  relative min-h-11 min-w-11 w-11 h-11 sm:w-10 sm:h-10 sm:min-h-10 sm:min-w-10 rounded-md text-xs font-mono transition-all flex items-center justify-center
                  ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${isAnswered ? 'bg-primary/20 text-primary border border-primary/30' : 'glass-panel text-foreground/60'}
                `}
              >
                {i + 1}
                {isFlagged && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-background" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content: Question View — chrome fixed, body scrolls */}
      <main className="flex-1 flex flex-col order-1 md:order-2 min-h-0 overflow-hidden relative">
        {!online && (
          <div className="shrink-0 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs sm:text-sm px-4 sm:px-6 py-2 text-center">
            You are offline. Your answers are saved on this device - reconnect to submit.
          </div>
        )}
        {/* Topbar: Timer & Controls */}
        <div className="shrink-0 z-10 glass-panel border-x-0 border-t-0 p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="font-mono text-xs sm:text-sm opacity-60 shrink-0">
            Question {store.idx + 1} of {store.items.length}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
            {!store.untimed ? (
              <div
                className={`flex items-center gap-1.5 sm:gap-2 font-mono text-base sm:text-lg font-bold px-2 sm:px-3 py-1 rounded-md border shrink-0 ${isDanger ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-primary/10 text-primary border-primary/20'}`}
              >
                <Clock className="w-4 h-4" />
                {timeLeft || '...'}
              </div>
            ) : (
              <div className="font-mono text-xs font-bold px-2 sm:px-3 py-1.5 rounded-md border border-border text-muted bg-[var(--overlay-subtle)] shrink-0">
                Practice - untimed
              </div>
            )}
            <button
              type="button"
              onClick={() => store.flagQuestion(store.idx, !currentQ.flagged)}
              aria-label={currentQ.flagged ? 'Unflag for review' : 'Flag for review'}
              aria-pressed={currentQ.flagged}
              className={`flex items-center gap-2 min-h-11 min-w-11 justify-center px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors border shrink-0 ${currentQ.flagged ? 'bg-destructive/20 text-destructive border-destructive/30' : 'glass-panel text-foreground/70'}`}
            >
              <Flag className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Flag for Review</span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit focus mode' : 'Focus mode'}
              aria-label={isFullscreen ? 'Exit focus mode' : 'Focus mode'}
              className="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-md border border-border text-foreground/70 hover:text-primary hover:border-ring transition-colors shrink-0"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <span className="hidden sm:inline-flex shrink-0">
              <ThemeToggle />
            </span>
          </div>
        </div>

        {/* Question Area — the only vertical scroller for stem + options */}
        <div
          ref={questionScrollRef}
          data-testid="exam-question-scroll"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-12"
        >
          <div className="max-w-4xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={store.idx}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6 sm:gap-8"
              >
                <div
                  data-testid="exam-question-stem"
                  className="text-base sm:text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQ.text) }}
                />

                <div className="flex flex-col gap-3" data-testid="exam-options">
                  {currentQ.options.map((opt) => {
                    const letter = opt.letter;
                    const isSelected = currentQ.chosenLetter === opt.letter;
                    return (
                      <label
                        key={opt.letter}
                        className={`
                        relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-all border focus-within:outline-none focus-within:ring-2 focus-within:ring-ring
                        ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-[0_0_15px_var(--glow)]'
                            : 'glass-panel border-border hover:border-ring'
                        }
                      `}
                      >
                        <input
                          type="radio"
                          name="q-opt"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => store.answerQuestion(store.idx, opt.letter)}
                        />
                        <div
                          className={`
                        shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-mono text-sm font-bold border
                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-[var(--overlay-subtle)] border-border'}
                      `}
                        >
                          {letter}
                        </div>
                        <div
                          className="pt-1 text-sm sm:text-base leading-relaxed min-w-0 break-words"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt.text) }}
                        />
                        {isSelected && (
                          <CheckCircle2 className="absolute top-3 sm:top-4 right-3 sm:right-4 w-5 h-5 text-primary opacity-50 shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Actions — always visible above the palette on mobile */}
        <div className="shrink-0 z-10 glass-panel border-x-0 border-b-0 p-3 sm:p-4 md:p-6 flex items-center justify-between gap-2 bg-background/90 safe-area-pb">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => store.setIndex(store.idx - 1)}
            className="btn ghost flex items-center gap-1 sm:gap-2 disabled:opacity-30 min-h-11 px-4 sm:px-4 py-2.5 text-sm sm:text-base"
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={() => store.setIndex(store.idx + 1)}
              className="bg-foreground text-background min-h-11 px-5 sm:px-6 py-2.5 rounded-md font-semibold flex items-center gap-1 sm:gap-2 hover:bg-foreground/90 transition-colors text-sm sm:text-base"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit(false)}
              className="bg-primary text-primary-foreground min-h-11 px-5 sm:px-6 py-2.5 rounded-md font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_var(--glow)] text-sm sm:text-base"
            >
              Submit Exam
            </button>
          )}
        </div>
      </main>

      {/* Anti-Cheat Modal */}
      <AnimatePresence>
        {cheatWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-panel max-w-md p-6 sm:p-8 flex flex-col gap-4 rounded-xl border-destructive/50 items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mb-2">
                <Flag className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-destructive">Focus Lost</h2>
              <p className="text-foreground/80">
                You have left the exam window. This is warning {warnings} of 3. If you reach 3
                warnings, your exam will be automatically terminated.
              </p>
              <button
                type="button"
                onClick={() => setCheatWarning(false)}
                className="mt-4 bg-destructive text-destructive-foreground px-6 py-2 rounded-md font-bold hover:bg-destructive transition-colors"
              >
                I Understand, Return to Exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
