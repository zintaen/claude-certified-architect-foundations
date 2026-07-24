import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogExamCodes, examByCode } from '@/lib/examRegistry';
import IndependenceDisclaimer from '@/components/IndependenceDisclaimer';

type Props = { params: Promise<{ code: string }> };

export async function generateStaticParams() {
  return catalogExamCodes().map((code) => ({ code }));
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const exam = examByCode(code);
  if (!exam) return {};
  return {
    title: `${exam.shortName} sample questions | CyberSkill`,
    description: `Free sample-style practice prompts for ${exam.name}.`,
  };
}

export default async function ExamSamplePage({ params }: Props) {
  const { code } = await params;
  if (code === 'ccaf' || !catalogExamCodes().includes(code)) notFound();
  const exam = examByCode(code)!;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted">{exam.code.toUpperCase()}</p>
        <h1 className="text-3xl font-bold">Sample questions</h1>
        <p className="text-muted">
          Free sample surface for SEO and orientation. Full sittings live under Practice / Timed
          mock once the exam catalog is seeded.
        </p>
      </header>
      <p className="text-sm">
        Start a full practice sitting:{' '}
        <Link href={exam.practiceHref} className="text-primary underline">
          {exam.practiceHref}
        </Link>
      </p>
      <IndependenceDisclaimer />
    </main>
  );
}
