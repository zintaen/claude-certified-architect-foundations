import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Layers,
  ListChecks,
  Lightbulb,
} from 'lucide-react';
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains';

const SITE_URL = 'https://ccaf.cyberskill.world';

export const metadata = {
  title: 'How to pass the Claude Certified Architect Foundations exam | Study guide',
  description:
    'A free study guide for the Anthropic Claude Certified Architect - Foundations (CCA-F) exam: format, the four domains, a study plan built around our practice mock, and exam-day tips. Unofficial, by CyberSkill.',
  alternates: { canonical: '/guide' },
};

const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to pass the Claude Certified Architect - Foundations exam',
  description:
    'A study guide for the Anthropic Claude Certified Architect - Foundations (CCA-F) exam: format, the four domains, a study plan built around a practice mock, and exam-day tips.',
  author: { '@type': 'Organization', name: 'CyberSkill' },
  publisher: {
    '@type': 'Organization',
    name: 'CyberSkill',
    url: 'https://cyberskill.world',
  },
  inLanguage: 'en',
  isAccessibleForFree: true,
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/guide` },
};

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Study guide', item: `${SITE_URL}/guide` },
  ],
};

export default function GuidePage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          How to pass the Claude Certified Architect Foundations exam
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          This guide explains what the Claude Certified Architect - Foundations (CCA-F) exam asks of
          you and how to prepare with a focused plan. It is written by CyberSkill and is an
          unofficial study aid, not affiliated with or endorsed by Anthropic. Everything here is
          free, including the practice mock it points you to.
        </p>
      </header>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> What the exam is
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          CCA-F tests whether you can make sound design decisions when building agents on Claude. It
          is the foundations tier of Anthropic&apos;s architect certification. The questions are
          scenarios, not vocabulary checks: you are shown a situation an agent system runs into and
          asked which approach handles it best. You are rewarded for judgment about trade-offs,
          failure handling, and clean interfaces between components, not for memorizing definitions.
        </p>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Format at a glance
        </h2>
        <ul className="flex flex-col gap-2 text-foreground/80 leading-relaxed">
          <li>60 scenario multiple-choice questions in one session.</li>
          <li>120 minutes, which works out to about two minutes per question.</li>
          <li>Scored on a 0 to 1,000 scale. The pass mark is 720 out of 1,000.</li>
          <li>
            Judgment-based: most questions have a clearly best answer and tempting near-misses.
          </li>
        </ul>
        <p className="text-foreground/70 leading-relaxed">
          Our practice mock mirrors this exactly: 60 questions, a 120-minute timer, the same 720
          pass line, and an explanation for every option so you learn why the near-misses fall
          short.
        </p>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> The four domains
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          Our mock splits its 60 questions evenly across four domains, 15 each. Each domain maps to
          a kind of system an agent architect is expected to reason about.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOMAIN_ORDER.map((id) => {
            const d = DOMAINS[id];
            return (
              <div key={id} className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <h3 className="font-bold">{d.label}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{d.blurb}</p>
                <p className="text-xs text-muted">Strong-domain archetype: {d.archetype}</p>
              </div>
            );
          })}
        </div>
        <p className="text-foreground/70 leading-relaxed">
          The full domain pages go deeper on what each one covers and why it matters.{' '}
          <Link href="/domains" className="text-primary hover:underline">
            Browse the domains
          </Link>
          .
        </p>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> A study plan that uses this mock
        </h2>
        <ol className="flex flex-col gap-3 text-foreground/80 leading-relaxed list-decimal pl-5">
          <li>
            Take one full timed run first, cold. A baseline under the real clock tells you where you
            actually stand and gets you used to the two-minute-per-question pace.
          </li>
          <li>
            Review every explanation, including the ones you answered correctly. The reasoning is
            the point. Note the trap pattern behind each wrong option so you recognize it next time.
          </li>
          <li>
            Drill your weakest domain. After a run you see a per-domain breakdown, so target the 15
            questions where you lost the most points and work them untimed until the reasoning
            clicks.
          </li>
          <li>
            Use the flashcards for quick recall between full attempts. They are good for short,
            repeated sessions when you do not have a free two hours.
          </li>
          <li>
            Re-sit the full timed mock a few days later. Aim to clear 720 comfortably, not by one
            point, before you book the real exam.
          </li>
        </ol>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" /> Exam-day tips
        </h2>
        <ul className="flex flex-col gap-2 text-foreground/80 leading-relaxed">
          <li>
            Read the whole scenario before the options. The constraint that decides the answer is
            often in the last sentence.
          </li>
          <li>
            Pick the answer that handles failure honestly. Options that hide errors or skip
            escalation usually lose.
          </li>
          <li>
            Watch the clock loosely. Two minutes per question is plenty if you flag the hard ones
            and come back rather than stalling.
          </li>
          <li>
            Prefer the simplest design that meets the requirement. Over-engineered answers are
            common traps.
          </li>
          <li>
            Answer everything. There is no benefit to leaving a question blank, so make your best
            call and move on.
          </li>
        </ul>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Start your timed run</h2>
        <p className="text-foreground/80 leading-relaxed">
          Reading about the format only gets you so far. Sit a full mock under the clock, review the
          explanations, and drill what you miss.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Start the mock exam <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/practice"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            Practice modes and drills <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
