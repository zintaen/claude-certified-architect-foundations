'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { track } from '@/lib/track';
import {
  PlayCircle,
  ShieldCheck,
  Zap,
  BarChart,
  X,
  Workflow,
  FileText,
  MessageSquare,
  Code2,
  UserPlus,
  Timer,
  ListChecks,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import DonateButton from '@/components/DonateButton';
import { fetchGlobalStats } from '@/lib/api';
import { useExamEngine } from '@/hooks/useExamEngine';
import { questions } from '@/data/questions';
import ResumeBanner from '@/components/ResumeBanner';
import { confirmDiscardIfInProgress } from '@/lib/session';
import { canStartExamOffline } from '@/lib/offline';

const DOMAINS = [
  {
    icon: Workflow,
    name: 'Research pipelines',
    count: 15,
    desc: 'Multi-agent orchestration, state recovery after failures, and context-efficient hand-offs between a coordinator and its sub-agents.',
  },
  {
    icon: FileText,
    name: 'Extraction pipelines',
    count: 15,
    desc: 'Tool contract design, structured output, and reliable data extraction when instructions and inputs are ambiguous.',
  },
  {
    icon: MessageSquare,
    name: 'Customer support agents',
    count: 15,
    desc: 'Graceful degradation, escalation judgment, conversation state, and honest handling of backend failures.',
  },
  {
    icon: Code2,
    name: 'Code exploration',
    count: 15,
    desc: 'Navigating unfamiliar codebases, scoping searches, and reasoning about large repositories with agents.',
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: 'Set up, or stay a guest',
    desc: 'Add a nickname to join the leaderboard, or an email and PIN to save your history across attempts. Guest mode needs nothing.',
  },
  {
    icon: Timer,
    title: 'Take the timed mock',
    desc: '60 scenario questions in one 120-minute session, with question flagging, focus tracking, and a score on the 1,000-point scale.',
  },
  {
    icon: ListChecks,
    title: 'Review every answer',
    desc: 'See which options were right or wrong and read the reasoning behind each one, so you learn from the questions you miss.',
  },
];

const STATS = [
  { value: '60', label: 'Scenario questions' },
  { value: '120', label: 'Minutes, timed' },
  { value: '4', label: 'Domains covered' },
  { value: '1,000', label: 'Point scale' },
];

const FAQ = [
  {
    q: 'Is this the vendor exam?',
    a: 'No. This is an unofficial practice mock built by CyberSkill. It is not affiliated with, affiliated with, or sponsored by Anthropic.',
  },
  {
    q: 'Is it free?',
    a: 'A free practice tier is always available — take the timed mock as a guest with no account. Paid plans unlock the full multi-exam bank and premium features; see /pricing.',
  },
  {
    q: 'How is it scored?',
    a: 'Sixty questions on a 1,000-point scale. This mock flags 720, the published pass mark, as a pass.',
  },
  {
    q: 'Do I need to sign up?',
    a: 'No. A nickname puts you on the leaderboard, and an optional PIN lets you restore your history later. Both are optional.',
  },
  {
    q: 'Can I practice without the timer?',
    a: 'Yes. The practice modes include an untimed full mock, single-domain drills, and flashcards.',
  },
  {
    q: 'Can I pause and come back?',
    a: 'Yes. Your progress saves on your device as you go, so you can close the tab or lose your connection and resume the same sitting from the home page.',
  },
];

// Hash the PIN before it touches storage so the history lock is never kept in plain text.
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface LiveStats {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}

export default function Home() {
  const router = useRouter();
  const { buildSession } = useExamEngine();
  const [showSetup, setShowSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [subscribe, setSubscribe] = useState(false);
  const [live, setLive] = useState<LiveStats | null>(null);

  useEffect(() => {
    setEmail(localStorage.getItem('ccaf-email') || '');
    setNickname(localStorage.getItem('ccaf-nickname') || '');
  }, []);

  // Attribute referral / challenge visits so the share loop is measurable.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) track('referred_visit', { ref: ref.slice(0, 40) });
    } catch {
      /* ignore */
    }
  }, []);

  // Live community numbers double as social proof; fail quietly if the API is unavailable.
  useEffect(() => {
    let active = true;
    fetchGlobalStats()
      .then((s) => {
        if (active && s && s.totalAttempts > 0) {
          setLive({
            totalAttempts: s.totalAttempts,
            averageScore: s.averageScore,
            passRate: s.passRate,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleStart = async () => {
    // Do not silently wipe a sitting that is already underway.
    if (!confirmDiscardIfInProgress()) return;
    // Normalize the email once here so the value written with each attempt and the value the
    // dashboard later queries by always match (trailing spaces or mixed case otherwise miss).
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) localStorage.setItem('ccaf-email', cleanEmail);
    if (nickname.trim()) localStorage.setItem('ccaf-nickname', nickname.trim());
    if (pin) {
      try {
        localStorage.setItem('ccaf-pinHash', await sha256Hex(pin));
      } catch {
        // crypto.subtle is unavailable outside a secure context; skip the PIN but still start.
      }
    }
    if (subscribe && cleanEmail) {
      track('subscribe_optin');
      // Fire-and-forget opt-in; never block starting the exam on it.
      void fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, source: 'exam-setup' }),
      }).catch(() => {});
    }
    // Always build a fresh timed session so "Begin exam" starts a new sitting, never a replay.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const refuse = canStartExamOffline();
      window.alert(refuse.reason);
      return;
    }
    buildSession(questions, 60, false);
    router.push('/exam');
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Abstract background glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gold/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gold/5 blur-[120px]" />
      </div>

      <ResumeBanner />

      {/* HERO */}
      <section className="w-full max-w-6xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-mono text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Free practice exam - by CyberSkill
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Master the <br />
            <span className="text-gradient">Claude Architect</span> <br />
            certification.
          </h1>

          <p className="text-lg text-muted max-w-md">
            A faithful simulation of the Anthropic Claude Certified Architect exam. Practice agent
            design, orchestration, tool contracts, and failure handling under real exam conditions.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSetup(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_var(--glow)] hover:shadow-[0_0_30px_var(--glow)] transition-all w-full sm:w-auto"
            >
              <PlayCircle className="w-5 h-5 shrink-0" />
              Start mock exam
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/practice')}
              className="glass-panel px-6 py-3 rounded-md font-medium hover:bg-[var(--overlay-strong)] transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Layers className="w-4 h-4 shrink-0" /> Practice modes
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/leaderboard')}
              className="glass-panel px-6 py-3 rounded-md font-medium hover:bg-[var(--overlay-strong)] transition-colors w-full sm:w-auto text-center"
            >
              View leaderboard
            </motion.button>
          </div>

          {live && (
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">
                {live.totalAttempts.toLocaleString()}
              </span>{' '}
              exams taken so far -{' '}
              <span className="font-semibold text-foreground">{live.passRate}%</span> pass rate -{' '}
              <span className="font-semibold text-foreground">{live.averageScore}</span> average
              score
            </p>
          )}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-border rounded-full blur-[2px] -z-10" />

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Timed simulation</h3>
            <p className="text-sm text-muted">
              Practice under the real 120-minute constraint to build your pacing strategy.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all translate-y-0 sm:translate-y-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Focus tracking</h3>
            <p className="text-sm text-muted">
              Strict focus and visibility checks mirror the discipline of a proctored sitting.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BarChart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Scored feedback</h3>
            <p className="text-sm text-muted">
              Get a 1,000-point score and per-question explanations to find your weak spots.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all translate-y-0 sm:translate-y-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <div className="font-bold font-mono">60</div>
            </div>
            <h3 className="font-semibold">Curated scenarios</h3>
            <p className="text-sm text-muted">
              Complex, multi-part questions drawn from real agent-engineering decisions.
            </p>
          </div>
        </motion.div>
      </section>

      {/* STATS STRIP */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-8">
        <div className="surface-panel rounded-2xl grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="p-6 flex flex-col items-center text-center gap-1">
              <div className="text-3xl md:text-4xl font-bold font-mono">{s.value}</div>
              <div className="text-xs uppercase tracking-widest text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DOMAINS */}
      <section className="w-full max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col gap-10">
        <div className="flex flex-col gap-3 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            What this mock covers
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Four domains, sixty scenarios
          </h2>
          <p className="text-muted">
            Every question is a realistic agent-engineering decision, evenly split across the four
            areas that define the architect role. No trivia, no memorization - judgment under
            constraints.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.name}
                className="surface-panel rounded-2xl p-6 flex flex-col gap-4 glass-panel-hover transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono surface-raised border border-border rounded-full px-3 py-1 text-muted">
                    {d.count} questions
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-muted leading-relaxed">{d.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col gap-10">
        <div className="flex flex-col gap-3 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">From start to score</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="surface-panel rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-sm">
                    {i + 1}
                  </div>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* BUILT BY CYBERSKILL */}
      <section className="w-full max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="surface-panel rounded-3xl p-8 md:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <Image
            src="/cyberskill-logo.svg"
            alt="CyberSkill"
            width={96}
            height={96}
            className="rounded-2xl w-20 h-20 md:w-24 md:h-24"
          />
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Built by CyberSkill
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              We build software, and we build people who build software.
            </h2>
            <p className="text-muted leading-relaxed max-w-2xl">
              CyberSkill is a software solutions consultancy founded in 2020. We design and ship
              products, developer tooling, and AI-driven workflows for teams worldwide. We made this
              mock exam because the fastest way to grow the Claude practitioner community is to give
              people a real way to practice - for free. Our motto says the rest: turn your will into
              real.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <a
                href="https://cyberskill.world"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
              >
                Visit cyberskill.world <ArrowRight className="w-4 h-4" />
              </a>
              <DonateButton variant="soft" label="Support this project" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full max-w-3xl mx-auto px-6 py-12 md:py-16 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Questions
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Good to know</h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="surface-panel rounded-xl px-5 py-4">
              <summary className="font-medium flex cursor-pointer items-center justify-between gap-4">
                {f.q}
              </summary>
              <p className="text-sm text-muted leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* SUPPORT CALLOUT */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-16">
        <div className="surface-raised border border-border rounded-3xl p-8 md:p-10 flex flex-col items-center text-center gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Free practice, paid unlocks
          </h2>
          <p className="text-muted max-w-xl">
            Start without an account on the free practice tier. When you need the full bank or
            multi-exam access, paid plans are on{' '}
            <Link href="/pricing" className="text-primary underline">
              pricing
            </Link>
            . Donations never unlock entitlements — they just keep the lights on.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <DonateButton variant="solid" />
            <button
              onClick={() => setShowSetup(true)}
              className="surface-panel border border-border px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:border-ring transition-colors"
            >
              <PlayCircle className="w-5 h-5" /> Start the mock
            </button>
          </div>
        </div>
      </section>

      {/* SETUP MODAL */}
      <AnimatePresence>
        {showSetup && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--scrim)] backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Exam setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-6 flex flex-col gap-6 rounded-t-2xl sm:rounded-2xl relative max-h-[92dvh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                aria-label="Close exam setup"
                className="absolute top-3 right-3 min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-[var(--overlay-strong)] transition-colors"
              >
                <X className="w-5 h-5 opacity-60" />
              </button>

              <div>
                <h2 className="text-xl font-bold mb-1">Exam setup</h2>
                <p className="text-sm text-muted">
                  Enter your details to save your progress on this device. Your email is used only
                  to restore your history; nothing is sent to you. All fields are optional.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">
                    Email (optional, to restore your history)
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ring"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">Nickname (for leaderboard)</span>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ring"
                    placeholder="CyberNinja99"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">
                    Secret PIN (to protect your history)
                  </span>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ring"
                    placeholder="****"
                  />
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subscribe}
                    onChange={(e) => setSubscribe(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-muted">
                    Send me occasional AI build tips from CyberSkill. No spam, and you can
                    unsubscribe anytime.
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="bg-primary text-primary-foreground w-full min-h-11 py-3 rounded-md font-bold mt-2 shadow-[0_0_15px_var(--glow)] hover:brightness-110 transition-all"
              >
                Begin exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
