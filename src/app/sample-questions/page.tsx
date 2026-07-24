import { MARK_CCAF_NAME } from '@/lib/legal';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ListChecks, CheckCircle2, Circle } from 'lucide-react';
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains';

import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Claude Certified Architect sample questions | Free examples with answers',
  description:
    'Four free sample questions with answers and explanations for the ' +
    MARK_CCAF_NAME +
    ' exam, across research pipelines, extraction pipelines, customer support agents, and code exploration. Unofficial, by CyberSkill.',
  alternates: { canonical: '/sample-questions' },
};

type Option = {
  letter: string;
  text: string;
  explanation: string;
  correct?: boolean;
};

type SampleQuestion = {
  domain: string;
  question: string;
  options: Option[];
  why: string;
};

const QUESTIONS: SampleQuestion[] = [
  {
    domain: 'Research pipelines',
    question:
      'A coordinator agent delegates document analysis to three sub-agents, and the run fails partway through. To resume without repeating finished work or bloating context, what should the coordinator persist and replay?',
    options: [
      {
        letter: 'A',
        text: 'The full conversation history of every sub-agent, replayed verbatim on resume.',
        explanation:
          'A full replay is the highest-fidelity but least context-efficient option; it refills the window with material the agents do not need.',
      },
      {
        letter: 'B',
        text: "Each sub-agent's final structured result to a known location; on resume the coordinator reloads those and re-dispatches only the unfinished work.",
        explanation:
          'Compact per-agent results keep fidelity while letting the coordinator re-dispatch only what is unfinished. This is the orchestrator plus compact-artifact pattern.',
        correct: true,
      },
      {
        letter: 'C',
        text: 'Nothing; restart the whole pipeline from the first document.',
        explanation: 'Restarting throws away completed work and wastes time and tokens.',
      },
      {
        letter: 'D',
        text: "Only the coordinator's last message, letting each sub-agent rebuild its state from scratch.",
        explanation:
          'Sub-agents cannot reliably reconstruct prior findings from one message; you lose state.',
      },
    ],
    why: 'Persisting compact, structured results per agent preserves prior findings and lets the coordinator resume only the unfinished work, which balances fidelity against context cost.',
  },
  {
    domain: 'Extraction pipelines',
    question:
      'You need reliable JSON from a model that sometimes wraps the object in prose. The most dependable approach is:',
    options: [
      {
        letter: 'A',
        text: 'Add "return only JSON" to the prompt and parse whatever comes back.',
        explanation:
          'Prompt wording alone does not guarantee shape; it fails on the edge cases that matter.',
      },
      {
        letter: 'B',
        text: 'Define a strict output schema or tool the model must call, then validate the result and retry on a schema failure.',
        explanation:
          'A declared schema or tool call plus validation makes extraction contract-driven and self-correcting.',
        correct: true,
      },
      {
        letter: 'C',
        text: 'Extract from the first brace to the last brace with a regular expression.',
        explanation:
          'Brace-matching breaks on nested or partial objects and silently returns wrong data.',
      },
      {
        letter: 'D',
        text: 'Set temperature to zero and accept the output as-is.',
        explanation:
          'Lower temperature reduces variation but does not enforce a structure or catch malformed output.',
      },
    ],
    why: 'Treating extraction as a validated contract (schema or tool plus a retry) is far more reliable than prompt-only or regex parsing.',
  },
  {
    domain: 'Customer support agents',
    question:
      'A support agent cannot verify a refund because the billing API is down. The best behavior is:',
    options: [
      {
        letter: 'A',
        text: 'Estimate the refund status so the conversation keeps moving.',
        explanation: 'Guessing risks telling the customer something false about their money.',
      },
      {
        letter: 'B',
        text: 'Tell the customer it is handled and reconcile it later.',
        explanation: 'A false assurance breaks trust the moment it turns out to be wrong.',
      },
      {
        letter: 'C',
        text: 'Say plainly that the billing system is temporarily unavailable, give a realistic next step or timeframe, and offer to escalate.',
        explanation:
          'Honest failure handling with a concrete next step and an escalation path preserves trust.',
        correct: true,
      },
      {
        letter: 'D',
        text: 'End the chat and tell the customer to try again later.',
        explanation: 'Dropping the customer with no path forward is a poor outcome and avoidable.',
      },
    ],
    why: 'When a tool fails, stating the limitation honestly with a next step and an escalation route is better than fabricating a status or giving false assurance.',
  },
  {
    domain: 'Code exploration',
    question:
      'An agent must find where a feature flag is enforced in a large repository. The most context-efficient first step is:',
    options: [
      {
        letter: 'A',
        text: 'Read every file in the repository into context.',
        explanation: 'Bulk-reading floods the context window and buries the relevant lines.',
      },
      {
        letter: 'B',
        text: "Search for the flag's identifier across the codebase, then open only the files that reference it.",
        explanation:
          'A targeted search narrows the surface before reading, keeping context focused on what matters.',
        correct: true,
      },
      {
        letter: 'C',
        text: 'Open the README and guess the likely location.',
        explanation: 'A guess from docs is unreliable and often points at stale information.',
      },
      {
        letter: 'D',
        text: 'Ask the user to paste the entire codebase.',
        explanation: 'This shifts work to the user and still overflows context.',
      },
    ],
    why: 'Searching by the known identifier first, then reading only the matching files, is the context-efficient way to locate enforcement in a large codebase.',
  },
];

const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Claude Certified Architect sample questions with answers and explanations',
  description:
    'Four free sample questions with answers and explanations for the {MARK_CCAF_NAME} exam, across research pipelines, extraction pipelines, customer support agents, and code exploration.',
  author: { '@type': 'Organization', name: 'CyberSkill' },
  publisher: {
    '@type': 'Organization',
    name: 'CyberSkill',
    url: 'https://cyberskill.world',
  },
  inLanguage: 'en',
  isAccessibleForFree: true,
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/sample-questions` },
};

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Sample questions',
      item: `${SITE_URL}/sample-questions`,
    },
  ],
};

export default function SampleQuestionsPage() {
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
          <ListChecks className="w-8 h-8 text-primary" />
          Claude Certified Architect sample questions
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          These four questions show the style of scenario you face on the Claude Certified Architect
          - Foundations exam, each with the answer and an explanation for every option. The full
          free mock has 60 scenario questions split across four domains, with 720 out of 1,000 to
          pass. The four below are original samples written by CyberSkill, separate from the
          mock&apos;s question bank, so their answers are shown here. This is an unofficial study
          aid and is not affiliated with or affiliated with Anthropic.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        {QUESTIONS.map((q, i) => (
          <article
            key={q.question}
            className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {q.domain}
              </span>
              <h2 className="text-lg font-bold leading-relaxed">
                {i + 1}. {q.question}
              </h2>
            </div>

            <ul className="flex flex-col gap-3">
              {q.options.map((opt) => (
                <li
                  key={opt.letter}
                  className={
                    opt.correct
                      ? 'rounded-xl border border-success/40 bg-success/10 p-4 flex flex-col gap-1'
                      : 'rounded-xl border border-border bg-[var(--overlay-subtle)] p-4 flex flex-col gap-1'
                  }
                >
                  <div className="flex items-start gap-2">
                    {opt.correct ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    )}
                    <p
                      className={
                        opt.correct
                          ? 'text-success font-semibold'
                          : 'text-foreground/85 font-medium'
                      }
                    >
                      <span className="font-bold">{opt.letter}.</span> {opt.text}
                      {opt.correct ? (
                        <span className="text-success font-bold"> (correct)</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed pl-7">
                    {opt.explanation}
                  </p>
                </li>
              ))}
            </ul>

            <p className="text-foreground/80 leading-relaxed border-t border-border pt-4">
              <span className="font-bold">Why:</span> {q.why}
            </p>
          </article>
        ))}
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold">Five more for each domain</h2>
        <p className="text-foreground/80 leading-relaxed">
          Each domain has its own set of five original sample questions with answers, on top of the
          four above.
        </p>
        <div className="flex flex-col gap-2">
          {DOMAIN_ORDER.map((id) => (
            <Link
              key={id}
              href={`/sample-questions/${id}`}
              className="text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 text-primary" /> {DOMAINS[id].label} sample questions
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Take the full free mock</h2>
        <p className="text-foreground/80 leading-relaxed">
          These four are a taste. The full mock puts 60 scenarios in front of you under a 120-minute
          timer, scores you against the 720 pass line, and explains every option so you learn why
          the near-misses fall short.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Take the full free mock <ArrowRight className="w-4 h-4" />
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
