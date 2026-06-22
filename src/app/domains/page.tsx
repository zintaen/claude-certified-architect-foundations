import Link from 'next/link';
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains';

const SITE_URL = 'https://claude-certified-architect-mock-exam-cyberskill.vercel.app';

export const metadata = {
  title: 'Exam domains - Claude Certified Architect practice | CyberSkill',
  description:
    'The four domains covered by our free Claude Certified Architect - Foundations practice mock: research pipelines, extraction pipelines, customer support agents, and code exploration. 15 questions each. Unofficial, by CyberSkill.',
  alternates: { canonical: '/domains' },
};

const itemListLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Claude Certified Architect Foundations practice domains',
  itemListElement: DOMAIN_ORDER.map((id, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: DOMAINS[id].label,
    url: `${SITE_URL}/domains/${id}`,
  })),
};

export default function DomainsPage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" />
          Exam domains
        </h1>
        <p className="text-foreground/70 leading-relaxed">
          Our practice mock splits 60 questions evenly across four domains, 15 each. Each one is a
          kind of agent system you are expected to reason about as an architect. Open a domain to
          see what it covers and drill it on its own. This is an unofficial study aid by CyberSkill,
          not affiliated with or endorsed by Anthropic.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {DOMAIN_ORDER.map((id) => {
          const d = DOMAINS[id];
          return (
            <Link
              key={id}
              href={`/domains/${id}`}
              className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-3 hover:border-ring transition-colors group"
            >
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors">
                {d.label}
              </h2>
              <p className="text-sm text-foreground/70 leading-relaxed">{d.blurb}</p>
              <span className="text-xs text-muted">15 questions in the full mock</span>
              <span className="text-sm text-primary inline-flex items-center gap-2 mt-1">
                Explore this domain <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="surface-raised border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-4 border-t-2 border-t-primary/40">
        <h2 className="text-xl font-bold">Sit the full mock</h2>
        <p className="text-foreground/80 leading-relaxed">
          The complete timed exam pulls from all four domains at once. Take it to see your
          per-domain breakdown, then drill the ones you miss.
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
