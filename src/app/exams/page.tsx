import Link from 'next/link';
import { EXAM_REGISTRY } from '@/lib/examRegistry';
import IndependenceDisclaimer from '@/components/IndependenceDisclaimer';

export const metadata = {
  title: 'Claude certification practice exams | CyberSkill',
  description:
    'Free independent practice for Anthropic Claude certification exams — Associate, Developer, and Architect tracks.',
};

export default function ExamsIndexPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted">Catalog</p>
        <h1 className="text-3xl font-bold tracking-tight">Claude certification practice</h1>
        <p className="text-muted max-w-2xl">
          Independent practice exams for Anthropic&apos;s role-based Claude credentials. Not
          affiliated with Anthropic.
        </p>
      </header>
      <ul className="space-y-4">
        {EXAM_REGISTRY.map((exam) => (
          <li key={exam.code} className="border-b border-border pb-4">
            <Link
              href={exam.landingHref}
              className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
            >
              {exam.name}
            </Link>
            <p className="text-sm text-muted mt-1">
              Code {exam.code.toUpperCase()}
              {exam.legacyCanonical ? ' · legacy CyberSkill surface' : ''}
            </p>
          </li>
        ))}
      </ul>
      <IndependenceDisclaimer />
    </main>
  );
}
