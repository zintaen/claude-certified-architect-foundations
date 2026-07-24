import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import IndependenceDisclaimer from '@/components/IndependenceDisclaimer';
import { PseoFreeItems } from '@/components/PseoFreeItems';
import { ExamFactBox, AnswerBlock } from '@/components/AeoBlocks';
import { answerBlock, factBox } from '@/lib/aeo';
import { examByCode } from '@/lib/examRegistry';
import {
  intentCopy,
  internalLinks,
  loadFreeItemsForPseo,
  pseoState,
  schemaFor,
  type PseoIntent,
} from '@/lib/pseo';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ code: string }>; intent: PseoIntent };

export async function pseoMetadata(code: string, intent: PseoIntent): Promise<Metadata> {
  const exam = examByCode(code);
  if (!exam || exam.legacyCanonical || code === 'ccaf') return { robots: { index: false } };
  const state = await pseoState(code, intent);
  const copy = intentCopy(intent, exam.shortName);
  return {
    title: `${copy.h1} | CyberSkill`,
    description: copy.angle.slice(0, 160),
    robots: state.indexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/exams/${code}/${intent}` },
  };
}

export async function PseoIntentPage({ params, intent }: Props) {
  const { code } = await params;
  if (code === 'ccaf') notFound();
  const exam = examByCode(code);
  if (!exam || exam.legacyCanonical) notFound();

  const state = await pseoState(code, intent);
  const copy = intentCopy(intent, exam.name);
  const items = await loadFreeItemsForPseo(code, state.freeItemsShown);
  // Strip keys from any SSR-visible dump; pass keys only as client props for reveal.
  const clientItems = items.map((i) => ({
    id: i.id,
    stem: i.stem,
    options: i.options,
    correctKey: i.correctKey,
  }));

  const faqs =
    intent === 'free-mock-test'
      ? [
          {
            q: `Is this an Anthropic-administered ${exam.shortName} exam?`,
            a: 'No. CyberSkill provides independent practice only. Verify registration with Anthropic.',
          },
          {
            q: 'Is the mock free?',
            a: 'Yes — the free mock path uses the free-tier practice line. Premium unlocks more attempts and deeper explanations.',
          },
        ]
      : intent === 'practice-questions'
        ? [
            {
              q: 'Are these the full bank?',
              a: 'No. These are free sample questions from the curated free set.',
            },
          ]
        : [
            {
              q: `How should I use this ${exam.shortName} practice exam page?`,
              a: 'Read the format notes, try the free samples, then start a practice sitting from the CTA.',
            },
          ];

  const schema = schemaFor(state, {
    title: copy.h1,
    faqs,
    itemStems: items.map((i) => i.stem.slice(0, 80)),
  });
  const links = internalLinks(code, intent);

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-16" data-pseo-intent={intent}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted">{code.toUpperCase()}</p>
        <h1 className="text-3xl font-bold tracking-tight">{copy.h1}</h1>
        <p className="text-foreground/70">{copy.angle}</p>
        {!state.indexable && (
          <p className="text-xs text-muted" data-testid="pseo-noindex-note">
            Indexing deferred until content threshold is met ({state.reasons.join('; ')}).
          </p>
        )}
      </header>

      <IndependenceDisclaimer vendor={exam.vendorKey} />

      <ExamFactBox fact={factBox(exam)} />

      <AnswerBlock
        block={answerBlock(
          copy.h1.includes('?') ? copy.h1 : `What is this ${copy.h1} page?`,
          copy.angle
        )}
      />

      <section className="space-y-3" data-testid={`pseo-section-${intent}`}>
        <h2 className="text-lg font-semibold">
          {intent === 'practice-exam'
            ? 'Mock format'
            : intent === 'practice-questions'
              ? 'Free question bank browse'
              : 'Timed mock overview'}
        </h2>
        <p className="text-sm text-foreground/80">
          {intent === 'practice-exam' &&
            `Practice sittings mirror the published item count target (${exam.logistics.item_count}) and duration (${exam.logistics.duration_minutes} minutes) from config — always verify with the exam vendor before booking.`}
          {intent === 'practice-questions' &&
            'Each sample below is from the free subset. Choosing an option reveals correctness in the browser only.'}
          {intent === 'free-mock-test' &&
            'Use one free full-mock attempt path when entitlements enforcement is on; until then, practice remains open. This page explains the mock shape — it is not the timed runner itself.'}
        </p>
        <Link
          href={exam.practiceHref}
          className="inline-flex rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {copy.cta}
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Logistics (config)</h2>
        <ul className="text-sm text-foreground/80 space-y-1">
          <li>
            List price (USD):{' '}
            {exam.logistics.price_usd == null
              ? 'verify with vendor'
              : `$${exam.logistics.price_usd}`}
          </li>
          <li>Delivery: {exam.logistics.delivery}</li>
          <li>Config retrieved: {exam.logistics.retrieved}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Free samples</h2>
        <PseoFreeItems items={clientItems} examCode={code} intent={intent} />
      </section>

      {faqs.length > 0 && (
        <section className="space-y-3" data-testid="pseo-faq">
          <h2 className="text-lg font-semibold">FAQ</h2>
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-medium">{f.q}</h3>
              <p className="text-sm text-foreground/80">{f.a}</p>
            </div>
          ))}
        </section>
      )}

      <nav className="space-y-2 border-t border-border pt-6" aria-label="Related">
        <h2 className="text-sm font-semibold">Related</h2>
        <ul className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-primary underline-offset-2 hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
