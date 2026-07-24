import { catalogExamCodes } from '@/lib/examRegistry';
import { PseoIntentPage, pseoMetadata } from '@/components/PseoIntentPage';

type Props = { params: Promise<{ code: string }> };

export async function generateStaticParams() {
  return catalogExamCodes().map((code) => ({ code }));
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return pseoMetadata(code, 'practice-exam');
}

export default async function Page({ params }: Props) {
  return <PseoIntentPage params={params} intent="practice-exam" />;
}
