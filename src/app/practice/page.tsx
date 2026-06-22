'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import { DOMAINS, DOMAIN_ORDER } from '@/lib/domains';
import {
  ArrowLeft,
  Timer,
  Layers,
  Target,
  Workflow,
  FileText,
  MessageSquare,
  Code2,
  ArrowRight,
} from 'lucide-react';

const DOMAIN_ICON = {
  research_pipeline: Workflow,
  extraction_pipeline: FileText,
  customer_support: MessageSquare,
  code_exploration: Code2,
} as const;

export default function PracticePage() {
  const router = useRouter();
  const engine = useExamEngine();

  const startUntimed = () => {
    engine.buildSession(questions, 60, true);
    router.push('/exam');
  };

  const startDrill = (group: (typeof DOMAIN_ORDER)[number]) => {
    engine.buildSession(questions, 15, true, { group });
    router.push('/exam');
  };

  const startFlashcards = () => {
    engine.buildSession(questions, 60, true, { flashcard: true });
    router.push('/flashcards');
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Practice modes
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Practice your way</h1>
        <p className="text-muted max-w-2xl">
          The full timed mock is the real test. These relaxed modes help you learn without the
          clock, and none of them count toward the global leaderboard.
        </p>
      </div>

      {/* Untimed full mock */}
      <div className="surface-panel rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Untimed full mock</h2>
            <p className="text-sm text-muted mt-1 max-w-md">
              All 60 questions, no countdown. Take your time and review every explanation at the
              end.
            </p>
          </div>
        </div>
        <button
          onClick={startUntimed}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all shrink-0"
        >
          Start untimed <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Targeted drill by domain */}
      <div className="surface-panel rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Drill a single domain</h2>
            <p className="text-sm text-muted mt-1 max-w-md">
              Focus on one area at a time. Each drill is 15 untimed questions from that domain.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {DOMAIN_ORDER.map((id) => {
            const Icon = DOMAIN_ICON[id];
            return (
              <button
                key={id}
                onClick={() => startDrill(id)}
                className="surface-raised border border-border rounded-xl p-4 flex items-center gap-3 text-left hover:border-ring transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{DOMAINS[id].label}</div>
                  <div className="text-xs text-muted">15 questions</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flashcards */}
      <div className="surface-panel rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Flashcards</h2>
            <p className="text-sm text-muted mt-1 max-w-md">
              Flip through scenarios, reveal the best answer and the reasoning, and rate yourself.
              No score, just learning.
            </p>
          </div>
        </div>
        <button
          onClick={startFlashcards}
          className="surface-raised border border-border px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:border-ring transition-colors shrink-0"
        >
          Start flashcards <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
