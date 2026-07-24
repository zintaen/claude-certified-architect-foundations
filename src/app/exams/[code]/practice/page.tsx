import { notFound } from 'next/navigation';
import CatalogExamRuntime from '@/components/CatalogExamRuntime';
import { catalogExamCodes } from '@/lib/examRegistry';

type Props = { params: Promise<{ code: string }> };

export async function generateStaticParams() {
  return catalogExamCodes().map((code) => ({ code }));
}

export const metadata = { robots: { index: false, follow: false } };

export default async function ExamPracticePage({ params }: Props) {
  const { code } = await params;
  if (code === 'ccaf' || !catalogExamCodes().includes(code)) notFound();
  return <CatalogExamRuntime examCode={code} mode="practice" />;
}
