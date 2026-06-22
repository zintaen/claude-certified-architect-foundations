import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type SP = { [k: string]: string | string[] | undefined };

const getStr = (sp: SP, k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');

function parse(sp: SP) {
  const n = parseInt(getStr(sp, 'score'), 10);
  const score = Number.isFinite(n) ? Math.max(0, Math.min(1000, n)) : 0;
  const passed = getStr(sp, 'passed') === '1';
  const archetype = getStr(sp, 'archetype')
    .replace(/[^\w \-]/g, '')
    .slice(0, 40);
  const nickname = getStr(sp, 'nickname')
    .replace(/[^\w \-]/g, '')
    .slice(0, 32);
  return { score, passed, archetype, nickname };
}

// A public, shareable score card. The OpenGraph image is generated per-score by /api/og, so a
// link posted to LinkedIn or X shows the real number and pulls the viewer back to the mock.
// Marked noindex because the query-param permutations are not pages worth indexing on their own.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const { score, passed, archetype, nickname } = parse(await searchParams);
  const who = nickname || 'A candidate';
  const title = `${who} scored ${score}/1000 on the Claude Certified Architect mock`;
  const description = passed
    ? `${who} passed the mock threshold. Take the free Claude Certified Architect practice exam, built by CyberSkill.`
    : 'Take the free Claude Certified Architect practice exam - 60 scenario questions, scored feedback, built by CyberSkill.';
  const og = `/api/og?score=${score}&passed=${passed ? '1' : '0'}&archetype=${encodeURIComponent(
    archetype
  )}&nickname=${encodeURIComponent(nickname)}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: '/score',
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export default async function ScorePage({ searchParams }: { searchParams: Promise<SP> }) {
  const { score, passed, archetype, nickname } = parse(await searchParams);
  const who = nickname ? `${nickname} scored` : 'A candidate scored';

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-16 flex flex-col items-center text-center gap-8">
      <div className="surface-raised border border-border rounded-2xl p-8 md:p-12 w-full flex flex-col items-center gap-5">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">
          Claude Certified Architect mock
        </div>
        <div className="text-foreground/70">{who}</div>
        <div className="text-6xl md:text-7xl font-bold font-mono tracking-tight">
          {score} <span className="text-2xl text-foreground/40">/ 1000</span>
        </div>
        <div
          className={`text-sm font-bold uppercase tracking-widest ${
            passed ? 'text-success' : 'text-primary'
          }`}
        >
          {passed ? 'Passed the mock threshold' : 'On the way - keep practicing'}
        </div>
        {archetype && (
          <div className="bg-[var(--overlay-subtle)] border border-border text-primary text-xs font-medium px-3 py-1 rounded-full">
            Archetype: {archetype}
          </div>
        )}
        <Link
          href="/"
          className="mt-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
        >
          Take the free mock exam <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="text-sm text-muted max-w-md">
        Built by{' '}
        <a
          href="https://cyberskill.world"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          CyberSkill
        </a>
        , we design and ship Claude-powered agents. Unofficial study aid, not affiliated with
        Anthropic.
      </p>
    </div>
  );
}
