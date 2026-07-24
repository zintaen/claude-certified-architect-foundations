import { MARK_CCAF_NAME } from '@/lib/legal';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'FAQ - Claude Certified Architect practice exam | CyberSkill',
  description:
    'Answers about the free, unofficial ' +
    MARK_CCAF_NAME +
    ' practice mock: is it the real exam, is it free, how many questions, the pass mark, scoring, retakes, the leaderboard, who built it, and email/PIN privacy.',
  alternates: { canonical: '/faq' },
};

type QA = { question: string; answer: string };

const FAQS: QA[] = [
  {
    question: 'Is this the real Anthropic certification exam?',
    answer:
      'No. This is an unofficial practice mock built by CyberSkill to help you prepare. It is not affiliated with, affiliated with, or sponsored by Anthropic. The real certification is administered by Anthropic.',
  },
  {
    question: 'Is it free?',
    answer:
      'Yes — a free practice tier covers the timed mock, domain drills, study guide, and flashcards with no account required. Paid plans unlock the full multi-exam bank and premium features (see Pricing). Donations never buy entitlements.',
  },
  {
    question: 'How many questions are there?',
    answer:
      'A full timed mock is 60 scenario multiple-choice questions, split evenly across four domains with 15 questions each. You have 120 minutes to complete it.',
  },
  {
    question: 'What is the pass mark?',
    answer:
      'The pass mark is 720 out of 1,000, the same line Anthropic publishes for the real Foundations exam. Our mock uses it so your practice result is comparable.',
  },
  {
    question: 'How is it scored?',
    answer:
      'Your result is reported on a 0 to 1,000 scale. After you finish, you get an overall score, a pass or fail against 720, and a breakdown showing how you did in each of the four domains so you know what to drill.',
  },
  {
    question: 'Can I retake it?',
    answer:
      'As many times as you like. The questions are the same across attempts, so the value of re-sitting is building speed and reinforcing the reasoning behind each answer until you clear 720 comfortably.',
  },
  {
    question: 'Does practice mode affect the leaderboard?',
    answer:
      'No. Only a completed full timed mock records a score on the global leaderboard. Practice runs, targeted drills, flashcards, and unfinished sessions are never counted toward the global stats.',
  },
  {
    question: 'Who built it?',
    answer:
      'CyberSkill, a software consultancy founded in 2020 in Ho Chi Minh City, Vietnam. We build products, developer tooling, and AI-driven workflows, and we made this exam as a free resource for people preparing to work with Claude.',
  },
  {
    question: 'Is my email and PIN safe?',
    answer:
      'Saving your progress is optional. If you choose to, your email and PIN are used only to store and retrieve your own exam history. You can take the exam as a guest without providing either.',
  },
];

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};

export default function FaqPage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-primary" />
          Frequently asked questions
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          Quick answers about this free, unofficial practice mock for the Claude Certified Architect
          - Foundations exam. Not affiliated with or affiliated with Anthropic.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {FAQS.map((f) => (
          <article
            key={f.question}
            className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-2"
          >
            <h2 className="text-lg font-bold">{f.question}</h2>
            <p className="text-foreground/80 leading-relaxed">{f.answer}</p>
          </article>
        ))}
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Ready to try it?</h2>
        <p className="text-foreground/80 leading-relaxed">
          Sit a full timed mock or read the study guide first to plan your prep.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Start the mock exam <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/guide"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            Read the study guide <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
