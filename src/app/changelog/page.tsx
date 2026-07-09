import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Changelog - Claude Certified Architect mock exam | CyberSkill',
  description:
    'Recent updates to the free Claude Certified Architect - Foundations (CCA-F) practice exam: fixes, new features, and improvements.',
  alternates: { canonical: '/changelog' },
};

type Entry = { date: string; items: string[] };

// User-facing changelog. Newest first. Keep entries plain and in the reader's language, not
// internal commit-speak.
const CHANGELOG: Entry[] = [
  {
    date: 'June 2026',
    items: [
      'Your results now appear immediately after you submit an exam.',
      'Flashcards show the four answer choices before you flip the card, then reveal the correct one with the explanation.',
      'Your dashboard is now in the top menu, so your saved history and stats are one tap away.',
      'Reopen the full breakdown of any past exam from your dashboard on any device, with every question, your answer, and the explanation.',
      'Your progress saves automatically as you go. If you close the tab or lose your connection, you can resume the same sitting from the home page.',
      'Save your progress with an email and PIN to resume an in-progress exam on another device.',
      'A clear offline indicator during the exam, since your answers are kept on your device even without a connection.',
      'New per-domain sample question pages, with five worked examples for each of the four exam areas.',
      'Answer letters now stay consistent between the exam, the review, and flashcards.',
      'More reliable leaderboard dates and ordering.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Changelog
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          What is new in the free Claude Certified Architect - Foundations mock exam. Found a bug or
          have a suggestion? Use the feedback button on any page, or email info@cyberskill.world.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {CHANGELOG.map((entry) => (
          <section
            key={entry.date}
            className="surface-panel rounded-2xl p-6 md:p-8 flex flex-col gap-4"
          >
            <h2 className="text-lg font-bold text-primary">{entry.date}</h2>
            <ul className="flex flex-col gap-3">
              {entry.items.map((it) => (
                <li key={it} className="flex items-start gap-3 text-foreground/85 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
