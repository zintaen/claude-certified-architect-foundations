import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  createTranslator,
  hreflangLanguages,
  isRoutedLocale,
  type RoutedLocale,
} from '@/i18n/config';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isRoutedLocale(locale)) return {};
  const tr = createTranslator(locale);
  return {
    title: `${tr('practice.title')} | CyberSkill`,
    description: tr('practice.subtitle'),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}/practice`,
      languages: hreflangLanguages('/practice'),
    },
  };
}

export default async function LocalePracticePage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isRoutedLocale(raw)) notFound();
  const locale = raw as RoutedLocale;
  const tr = createTranslator(locale);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid="locale-practice">
      <h1 className="text-3xl font-bold tracking-tight mb-4">{tr('practice.title')}</h1>
      <p className="text-lg text-muted leading-relaxed mb-4">{tr('practice.subtitle')}</p>
      <p
        className="text-sm border border-border rounded-md px-3 py-2 bg-panel/60 mb-8"
        data-testid="questions-in-english"
      >
        {tr('locale.questionsInEnglish')}
      </p>
      <p className="text-sm text-muted mb-6" lang="en">
        Sample item (English): Which Claude capability is most appropriate for multi-step tool use?
      </p>
      <Link
        href="/practice"
        className="text-primary underline underline-offset-2"
        data-testid="locale-practice-full"
      >
        {tr('home.ctaPractice')} →
      </Link>
    </div>
  );
}
