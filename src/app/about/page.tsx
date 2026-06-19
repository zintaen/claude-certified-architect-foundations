import Link from 'next/link';
import { ArrowLeft, Info, Clock, ShieldCheck, Trophy } from 'lucide-react';

export const metadata = {
  title: 'About - Claude Certified Architect Mock Exam',
  description:
    'About the unofficial CyberSkill practice exam for Claude Certified Architect - Foundations: format, scoring, privacy, and disclaimer.',
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
        <p className="text-foreground/60 mt-2">
          An unofficial, community-built practice exam for Claude Certified Architect - Foundations.
        </p>
      </div>

      <section className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Format
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          The timed mock mirrors the real exam: 60 multiple-choice questions in a single 120-minute
          session, scored on a 1,000-point scale. This mock flags 700 / 1000 as a working pass
          benchmark; the official pass mark is not public. You can flag and revisit questions, and
          submitting early or running out of time both end the session.
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
