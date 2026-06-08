'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamStore } from '@/store/examStore';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

export default function ExamPage() {
  const router = useRouter();
  const store = useExamStore();
  const engine = useExamEngine();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (store.items.length === 0) {
      // automatically start an exam with 60 questions if none exists
      engine.buildSession(questions, 60, false);
    }
  }, [engine, store.items.length]);

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
        engine.finishExam(true);
        router.push('/result');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, store.endsAt, store.finished, store.untimed, engine, router]);

  if (!mounted || store.items.length === 0) return null;

  const currentQ = store.items[store.idx];
  const isLast = store.idx === store.items.length - 1;
  const isFirst = store.idx === 0;

  const totalAnswered = store.items.filter((i) => i.chosenLetter).length;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-73px)]">
      {/* Sidebar: Navigation Palette */}
      <aside className="w-full md:w-64 glass-panel border-y-0 border-l-0 overflow-y-auto p-4 flex flex-col gap-4 order-2 md:order-1 h-48 md:h-full shrink-0">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="text-sm font-semibold">Questions</div>
          <div className="text-xs text-foreground/60">
            {totalAnswered}/{store.items.length}
          </div>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
          {store.items.map((it, i) => {
            const isCurrent = i === store.idx;
            const isAnswered = !!it.chosenLetter;
            const isFlagged = it.flagged;
            return (
              <button
                key={it.id}
                onClick={() => store.setIndex(i)}
                className={`
                  relative w-10 h-10 rounded-md text-xs font-mono transition-all flex items-center justify-center
                  ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${isAnswered ? 'bg-primary/20 text-primary border border-primary/30' : 'glass-panel text-foreground/60'}
                `}
              >
                {i + 1}
                {isFlagged && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-background" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content: Question View */}
      <main className="flex-1 flex flex-col order-1 md:order-2 overflow-y-auto relative">
        {/* Topbar: Timer & Controls */}
        <div className="sticky top-0 z-10 glass-panel border-x-0 border-t-0 p-4 flex items-center justify-between">
          <div className="font-mono text-sm opacity-60">
            Question {store.idx + 1} of {store.items.length}
          </div>
          <div className="flex items-center gap-4">
            {!store.untimed && (
              <div
                className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-md border ${isDanger ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-primary/10 text-primary border-primary/20'}`}
              >
                <Clock className="w-4 h-4" />
                {timeLeft || '...'}
              </div>
            )}
            <button
              onClick={() => store.flagQuestion(store.idx, !currentQ.flagged)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${currentQ.flagged ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'glass-panel text-foreground/70'}`}
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Flag for Review</span>
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div className="p-6 md:p-12 max-w-4xl w-full mx-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={store.idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              <div
                className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQ.text) }}
              />

              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = currentQ.chosenLetter === opt.letter;
                  return (
                    <label
                      key={opt.letter}
                      className={`
                        relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border
                        ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                            : 'glass-panel border-white/5 hover:border-white/20'
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
                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/5 border-white/10'}
                      `}
                      >
                        {letter}
                      </div>
                      <div
                        className="pt-1 text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt.text) }}
                      />
                      {isSelected && (
                        <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-primary opacity-50" />
                      )}
                    </label>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="sticky bottom-0 glass-panel border-x-0 border-b-0 p-4 md:p-6 flex items-center justify-between bg-background/80 mt-auto">
          <button
            disabled={isFirst}
            onClick={() => store.setIndex(store.idx - 1)}
            className="btn ghost flex items-center gap-2 disabled:opacity-30 px-4 py-2"
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>

          {!isLast ? (
            <button
              onClick={() => store.setIndex(store.idx + 1)}
              className="bg-foreground text-background px-6 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-foreground/90 transition-colors"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                engine.finishExam(false);
                router.push('/result');
              }}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              Submit Exam
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
