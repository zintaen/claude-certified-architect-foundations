import { MARK_CCAF_NAME } from '@/lib/legal';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ListChecks, CheckCircle2, Circle } from 'lucide-react';
import { DOMAIN_ORDER, DOMAINS, isGroupId } from '@/lib/domains';
import { SAMPLE_BY_DOMAIN } from '@/data/sampleQuestions';

import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return DOMAIN_ORDER.map((domain) => ({ domain }));
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!isGroupId(domain)) {
    return { title: 'Domain not found - Claude Certified Architect samples | CyberSkill' };
  }
  const d = DOMAINS[domain];
  return {
    title: `${d.label} sample questions with answers | Claude Certified Architect (CCA-F)`,
    description: `Five free, original ${d.label.toLowerCase()} sample questions for the ${MARK_CCAF_NAME} exam, each with the answer and an explanation for every option. Unofficial practice by CyberSkill.`,
    alternates: { canonical: `/sample-questions/${domain}` },
  };
}

export default async function DomainSamplePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  if (!isGroupId(domain)) notFound();

  const d = DOMAINS[domain];
  const questions = SAMPLE_BY_DOMAIN[domain];
  const others = DOMAIN_ORDER.filter((id) => id !== domain);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${d.label} sample questions with answers and explanations`,
    description: `Five original ${d.label.toLowerCase()} sample questions for the ${MARK_CCAF_NAME} exam, each with the answer and an explanation.`,
    author: { '@type': 'Organization', name: 'CyberSkill' },
    publisher: {
      '@type': 'Organization',
      name: 'CyberSkill',
      url: 'https://cyberskill.world',
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/sample-questions/${domain}` },
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
      {
        '@type': 'ListItem',
        position: 3,
        name: d.label,
        item: `${SITE_URL}/sample-questions/${domain}`,
      },
    ],
  };

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
        href="/sample-questions"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> All sample questions
      </Link>

      <header className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">{d.label}</span>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ListChecks className="w-8 h-8 text-primary" />
          {d.label} sample questions
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          Five original sample questions with answers and explanations for the{' '}
          {d.label.toLowerCase()} domain of the {MARK_CCAF_NAME} exam. They are written by
          CyberSkill and kept separate from the mock question bank, so the answers are shown here.
          This is an unofficial study aid and is not affiliated with or affiliated with Anthropic.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <article
            key={q.question}
            className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4"
          >
            <h2 className="text-lg font-bold leading-relaxed">
              {i + 1}. {q.question}
            </h2>

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

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold">Sample questions for the other domains</h2>
        <div className="flex flex-col gap-2">
          {others.map((id) => (
            <Link
              key={id}
              href={`/sample-questions/${id}`}
              className="text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 text-primary" /> {DOMAINS[id].label} sample questions
            </Link>
          ))}
          <Link
            href={`/domains/${domain}`}
            className="text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 text-primary" /> What the {d.label.toLowerCase()} domain
            covers
          </Link>
        </div>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Practice {d.label.toLowerCase()} for real</h2>
        <p className="text-foreground/80 leading-relaxed">
          These five are a taste. The full free mock has 15 {d.label.toLowerCase()} questions among
          its 60, under a 120-minute timer and scored against the 720 pass line, with an explanation
          on every option.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/practice"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Drill this domain (15 questions) <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            Take the full free mock <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
