import Link from 'next/link';
import { ArrowLeft, Info, Clock, ShieldCheck, Trophy, Layers, Sparkles } from 'lucide-react';
import DonateButton from '@/components/DonateButton';

export const metadata = {
  title: 'About - Claude Certified Architect Mock Exam | CyberSkill',
  description:
    'About the unofficial CyberSkill practice exam for Claude Certified Architect - Foundations: format, domains, scoring, privacy, and the team behind it.',
};

export default function AboutPage() {
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Info className="w-8 h-8 text-primary" />
          About this mock exam
        </h1>
        <p className="text-muted mt-2">
          An unofficial, community-built practice exam for Claude Certified Architect - Foundations,
          made and maintained by CyberSkill.
        </p>
      </div>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Format
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          The timed mock mirrors the real exam: 60 multiple-choice questions in a single 120-minute
          session, scored on a 1,000-point scale. A pass here is 720 / 1000, the mark Anthropic
          publishes for the real exam. You can flag and revisit questions, and submitting early or
          running out of time both end the session.
        </p>
      </section>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> What it covers
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          The 60 questions are split evenly across four domains, 15 each: research pipelines
          (multi-agent orchestration and state recovery), extraction pipelines (tool contracts and
          structured output), customer support agents (graceful degradation and escalation), and
          code exploration (navigating large codebases with agents). Every item is a scenario with a
          best answer and an explanation for each option. The official exam draws from six scenario
          types across weighted domains, with agentic architecture and orchestration the largest at
          27 percent; this mock covers four of those scenario types.
        </p>
      </section>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Leaderboard and saving progress
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          Completing a full timed mock records your score on the global leaderboard. Saving your
          progress is optional: provide an email and a PIN to keep your history and see it on your
          dashboard. Practice and incomplete sessions are not counted toward the global stats.
        </p>
      </section>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Privacy
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          Your email and PIN are used only to save and retrieve your own exam history. You can take
          the exam as a guest without providing either.
        </p>
      </section>

      <section className="surface-panel p-6 md:p-8 rounded-2xl flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Built by CyberSkill
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          CyberSkill (CyberSkill Software Solutions Consultancy and Development JSC) is a software
          consultancy founded in 2020 in Ho Chi Minh City, Vietnam. We design and ship products,
          developer tooling, and AI-driven workflows for teams worldwide. We built this exam as a
          free resource for people preparing to work seriously with Claude. Our motto is simple:
          turn your will into real.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-1">
          <a
            href="https://cyberskill.world"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:brightness-110 transition-all"
          >
            Visit cyberskill.world
          </a>
          <DonateButton variant="soft" label="Support this project" />
        </div>
      </section>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Disclaimer</h2>
        <p className="text-foreground/80 leading-relaxed">
          CCAF, Claude, and the Claude Partner Network are Anthropic products and programs. This
          site is an unofficial, community-made study aid and is not affiliated with, endorsed by,
          or sponsored by Anthropic. Built by{' '}
          <a
            href="https://cyberskill.world"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            CyberSkill
          </a>{' '}
          - Turn Your Will Into Real.
        </p>
      </section>
    </div>
  );
}
