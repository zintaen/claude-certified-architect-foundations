'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import { DOMAINS, DOMAIN_ORDER } from '@/lib/domains';
import ResumeBanner from '@/components/ResumeBanner';
import { confirmDiscardIfInProgress } from '@/lib/session';
import { track } from '@/lib/analytics';
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
  Sparkles,
} from 'lucide-react';
import { CustomExamBuilder } from '@/components/CustomExamBuilder';

const DOMAIN_ICON = {
  research_pipeline: Workflow,
  extraction_pipeline: FileText,
  customer_support: MessageSquare,
  code_exploration: Code2,
} as const;

export default function PracticePage() {
  const router = useRouter();
  const engine = useExamEngine();
  const [adaptiveMsg, setAdaptiveMsg] = useState<string | null>(null);
  const [adaptiveLocked, setAdaptiveLocked] = useState(false);
  const [adaptiveFocus, setAdaptiveFocus] = useState<string | null>(null);
  const [drillLen, setDrillLen] = useState(15);

  const startUntimed = () => {
    if (!confirmDiscardIfInProgress()) return;
    engine.buildSession(questions, 60, true);
    router.push('/exam');
  };

  const startDrill = (group: (typeof DOMAIN_ORDER)[number]) => {
    if (!confirmDiscardIfInProgress()) return;
    engine.buildSession(questions, 15, true, { group });
    router.push('/exam');
  };

  const startFlashcards = () => {
    if (!confirmDiscardIfInProgress()) return;
    engine.buildSession(questions, 60, true, { flashcard: true });
    router.push('/flashcards');
  };

  const startAdaptiveDrill = async () => {
    if (!confirmDiscardIfInProgress()) return;
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (!email || !pinHash) {
        setAdaptiveMsg('Save email + PIN first so we can use your practice history.');
        return;
      }
      const res = await fetch('/api/drill/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: 'ccaf', length: drillLen, email, pinHash }),
      });
      if (res.status === 403) {
        setAdaptiveLocked(true);
        return;
      }
      if (!res.ok) {
        setAdaptiveMsg('Could not build a drill plan.');
        return;
      }
      const plan = (await res.json()) as {
        itemIds: string[];
        focusedOn: string;
        targetDomains: { domainKey: string }[];
      };
      setAdaptiveFocus(plan.focusedOn);
      track('drill_started', {
        exam_code: 'ccaf',
        length: plan.itemIds.length,
        domains: plan.targetDomains.map((d) => d.domainKey).join(','),
      });
      engine.buildSession(questions, plan.itemIds.length, true, { itemIds: plan.itemIds });
      router.push('/exam');
    } catch {
      setAdaptiveMsg('Could not start adaptive drill.');
    }
  };

  return (
    <>
      <ResumeBanner />
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

        <div
          className="surface-panel rounded-2xl p-6 flex flex-col gap-4"
          data-testid="adaptive-drill"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Drill my weak areas</h2>
              <p className="text-sm text-muted mt-1 max-w-md">
                Adaptive practice weighted toward domains where your practice performance is
                weakest. Untimed; updates mastery through answers. Premium when entitlements are
                enforced.
              </p>
              {adaptiveFocus && (
                <p className="text-xs text-foreground/60 mt-2">Focused on: {adaptiveFocus}</p>
              )}
              {adaptiveLocked && (
                <p className="text-sm text-foreground/70 mt-2" data-testid="adaptive-drill-locked">
                  Adaptive drilling unlocks with premium. Single-domain drills below stay available.
                </p>
              )}
              {adaptiveMsg && <p className="text-sm text-foreground/60 mt-2">{adaptiveMsg}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-foreground/60">
              Length{' '}
              <select
                className="ml-1 rounded border border-border bg-background px-2 py-1"
                value={drillLen}
                onChange={(e) => setDrillLen(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void startAdaptiveDrill()}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
            >
              Start adaptive drill <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <CustomExamBuilder />

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
    </>
  );
}
