import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogExamCodes, examByCode } from '@/lib/examRegistry';
import IndependenceDisclaimer from '@/components/IndependenceDisclaimer';
import { ExamFactBox, AnswerBlock } from '@/components/AeoBlocks';
import { answerBlock, factBox } from '@/lib/aeo';

type Props = { params: Promise<{ code: string }> };

export async function generateStaticParams() {
  return catalogExamCodes().map((code) => ({ code }));
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const exam = examByCode(code);
  if (!exam || exam.legacyCanonical) return {};
  return {
    title: `${exam.name} practice | CyberSkill`,
    description: `Free independent practice for ${exam.name} (${exam.code.toUpperCase()}).`,
    openGraph: {
      title: `${exam.shortName} practice — CyberSkill`,
      description: `Unofficial practice for ${exam.name}.`,
    },
  };
}

export default async function ExamLandingPage({ params }: Props) {
  const { code } = await params;
  if (code === 'ccaf') notFound();
  const exam = examByCode(code);
  if (!exam || exam.legacyCanonical) notFound();

  const { logistics, pass_threshold } = exam;
  const thresholdLabel =
    pass_threshold.basis === 'site_default'
      ? `${pass_threshold.value}% (site default — not a published vendor cut score)`
      : `${pass_threshold.value}% (vendor-published)`;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted">{exam.code.toUpperCase()}</p>
        <h1 className="text-3xl font-bold tracking-tight">{exam.name}</h1>
        <p className="text-muted">
          Independent practice. Verify current registration details with the exam vendor before
          booking.
        </p>
      </header>

      <ExamFactBox fact={factBox(exam)} />

      <AnswerBlock
        block={answerBlock(
          `What is the best free ${exam.shortName} practice option?`,
          `CyberSkill offers independent free practice for ${exam.name} at /exams/${exam.code}, including practice sittings and sample questions. It is not affiliated with the exam vendor — verify registration details with the vendor.`
        )}
      />

      <section className="space-y-3" data-testid="exam-logistics">
        <h2 className="text-lg font-semibold">Exam logistics (config)</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-muted">List price (USD)</dt>
            <dd>
              {logistics.price_usd == null
                ? 'Verify with vendor (not set in config)'
                : `$${logistics.price_usd}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-muted">Delivery</dt>
            <dd>{logistics.delivery}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-muted">Validity</dt>
            <dd>
              {logistics.validity_months == null
                ? 'Verify with vendor'
                : `${logistics.validity_months} months`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-muted">Practice pass threshold</dt>
            <dd>{thresholdLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-muted">Config retrieved</dt>
            <dd>{logistics.retrieved}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">
          Source:{' '}
          <a href={logistics.source_url} className="text-primary underline" rel="noreferrer">
            {logistics.source_url}
          </a>
          . Always verify current details with the vendor before registering.
        </p>
      </section>

      <nav className="flex flex-wrap gap-4">
        <Link
          href={exam.practiceHref}
          className="px-4 py-2 rounded-lg bg-primary text-white min-h-11 inline-flex items-center"
        >
          Practice
        </Link>
        <Link
          href={exam.examHref}
          className="px-4 py-2 rounded-lg border border-border min-h-11 inline-flex items-center"
        >
          Timed mock
        </Link>
        <Link
          href={exam.sampleHref}
          className="px-4 py-2 rounded-lg border border-border min-h-11 inline-flex items-center"
        >
          Sample questions
        </Link>
        <Link
          href={`/exams/${exam.code}/practice-exam`}
          className="px-4 py-2 rounded-lg border border-border min-h-11 inline-flex items-center"
        >
          Practice exam guide
        </Link>
        <Link
          href={`/exams/${exam.code}/practice-questions`}
          className="px-4 py-2 rounded-lg border border-border min-h-11 inline-flex items-center"
        >
          Free questions
        </Link>
        <Link
          href={`/exams/${exam.code}/free-mock-test`}
          className="px-4 py-2 rounded-lg border border-border min-h-11 inline-flex items-center"
        >
          Free mock test
        </Link>
      </nav>

      <IndependenceDisclaimer vendor={exam.vendorKey} />
    </main>
  );
}
