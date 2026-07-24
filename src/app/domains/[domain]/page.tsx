import { MARK_CCAF_NAME } from '@/lib/legal';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import { DOMAIN_ORDER, DOMAINS, isGroupId, type GroupId } from '@/lib/domains';

import { SITE_URL } from '@/lib/site';

type DomainContent = {
  covers: string;
  matters: string;
};

// Per-domain prose. Kept here so each page reads as real guidance rather than a
// repeated one-liner. Accurate to what the mock drills in each domain.
const CONTENT: Record<GroupId, DomainContent> = {
  research_pipeline: {
    covers:
      'Research-pipeline questions put you in charge of a multi-agent system that gathers and synthesizes information. You decide how to split work across agents, how to hand off context between them without wasting tokens, and how to recover state when a sub-agent fails partway through. Expect scenarios about orchestration patterns, retries, and keeping a long-running job coherent.',
    matters:
      'Multi-agent research is where small design mistakes compound fastest. An orchestration lead who plans for failure, keeps hand-offs lean, and can resume after a crash ships systems that finish their work instead of stalling or burning context. This domain checks that judgment directly.',
  },
  extraction_pipeline: {
    covers:
      'Extraction-pipeline questions are about pulling structured data out of messy input reliably. You design the tool contracts, choose how strict the schema should be, and decide what the agent does when the source is ambiguous or incomplete. Expect scenarios on structured output, validation, and handling the cases that do not fit the happy path.',
    matters:
      'An extraction system is only as good as its worst input. A tooling architect who designs clear contracts and sensible behavior under ambiguity gets data you can trust downstream, instead of silent corruption. This domain tests whether you can build that reliability in from the start.',
  },
  customer_support: {
    covers:
      'Customer-support questions put an agent in front of real users with real problems. You decide when to answer, when to escalate to a human, and how to fail honestly when the agent cannot help. Expect scenarios on graceful degradation, escalation judgment, and avoiding confident wrong answers.',
    matters:
      'In support, an overconfident agent does more damage than a cautious one. A reliability engineer who knows when to hand off and how to admit limits keeps users trusting the system. This domain checks that you would rather be honest than impressive.',
  },
  code_exploration: {
    covers:
      'Code-exploration questions are about pointing an agent at a large codebase and getting useful results. You scope searches, decide how much of the tree to load, and plan how the agent navigates unfamiliar code without drowning in it. Expect scenarios on search strategy, context budgeting, and finding the right files efficiently.',
    matters:
      'A codebase navigator who scopes searches well turns a sprawling repo into something an agent can actually work in. Get this wrong and the agent wastes its context on noise and misses the real answer. This domain tests whether you can keep exploration focused.',
  },
};

export async function generateStaticParams() {
  return DOMAIN_ORDER.map((domain) => ({ domain }));
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!isGroupId(domain)) {
    return { title: 'Domain not found - Claude Certified Architect practice | CyberSkill' };
  }
  const d = DOMAINS[domain];
  return {
    title: `${d.label} - CCA-F practice domain | CyberSkill`,
    description: `${d.blurb} What this ${MARK_CCAF_NAME} domain covers, why it matters for an agent architect, and how to drill its 15 questions. Free and unofficial, by CyberSkill.`,
    alternates: { canonical: `/domains/${domain}` },
  };
}

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!isGroupId(domain)) notFound();

  const d = DOMAINS[domain];
  const content = CONTENT[domain];

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${d.label} - Claude Certified Architect Foundations practice domain`,
    description: d.blurb,
    author: { '@type': 'Organization', name: 'CyberSkill' },
    publisher: {
      '@type': 'Organization',
      name: 'CyberSkill',
      url: 'https://cyberskill.world',
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/domains/${domain}` },
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <Link
        href="/domains"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> All domains
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" />
          {d.label}
        </h1>
        <p className="text-foreground/70 leading-relaxed">{d.blurb}</p>
        <p className="text-sm text-muted">
          15 questions in the full mock. Strong-domain archetype: {d.archetype}. This is an
          unofficial study aid by CyberSkill, not affiliated with or affiliated with Anthropic.
        </p>
      </header>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold">What it covers</h2>
        <p className="text-foreground/80 leading-relaxed">{content.covers}</p>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold">Why it matters for an agent architect</h2>
        <p className="text-foreground/80 leading-relaxed">{content.matters}</p>
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Drill this domain</h2>
        <p className="text-foreground/80 leading-relaxed">
          Work the 15 questions in {d.label.toLowerCase()} on their own until the reasoning clicks,
          then sit the full timed mock to see how it holds up under the clock.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/practice"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
          >
            Drill this domain (15 questions) <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/sample-questions/${domain}`}
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            See 5 sample questions <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            Start the full mock <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
