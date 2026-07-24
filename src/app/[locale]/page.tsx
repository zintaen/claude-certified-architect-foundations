import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  createTranslator,
  hreflangLanguages,
  isRoutedLocale,
  localizePath,
  type RoutedLocale,
} from '@/i18n/config';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isRoutedLocale(locale)) return {};
  const tr = createTranslator(locale);
  return {
    title: `${tr('home.title')} | CyberSkill`,
    description: tr('home.subtitle'),
    alternates: {
      canonical: `/${locale}`,
      languages: hreflangLanguages('/'),
    },
  };
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isRoutedLocale(raw)) notFound();
  const locale = raw as RoutedLocale;
  const tr = createTranslator(locale);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid="locale-home">
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
        {tr('home.eyebrow')}
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{tr('home.title')}</h1>
      <p className="text-lg text-muted leading-relaxed mb-8">{tr('home.subtitle')}</p>
      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href={localizePath(locale, '/practice')}
          className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-medium min-h-11 inline-flex items-center"
          data-testid="locale-cta-practice"
        >
          {tr('home.ctaPractice')}
        </Link>
        <Link
          href="/exams"
          className="px-4 py-2.5 rounded-md border border-border font-medium min-h-11 inline-flex items-center"
        >
          {tr('home.ctaExams')}
        </Link>
      </div>
      <p className="text-xs text-muted leading-relaxed" data-testid="independence-disclaimer">
        {tr('disclaimer.independence')}
      </p>
      <p className="mt-4 text-xs text-muted" data-testid="locale-trademark">
        {tr('disclaimer.trademark')}
      </p>
    </div>
  );
}
