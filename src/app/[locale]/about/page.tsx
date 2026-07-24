import type { Metadata } from 'next';
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
    title: `${tr('about.title')} | CyberSkill`,
    description: tr('about.body'),
    alternates: {
      canonical: `/${locale}/about`,
      languages: hreflangLanguages('/about'),
    },
  };
}

export default async function LocaleAboutPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isRoutedLocale(raw)) notFound();
  const locale = raw as RoutedLocale;
  const tr = createTranslator(locale);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid="locale-about">
      <h1 className="text-3xl font-bold tracking-tight mb-4">{tr('about.title')}</h1>
      <p className="text-lg text-muted leading-relaxed mb-8">{tr('about.body')}</p>
      <p className="text-xs text-muted leading-relaxed" data-testid="independence-disclaimer">
        {tr('disclaimer.independence')}
      </p>
      <p className="mt-4 text-xs text-muted" data-testid="locale-trademark">
        {tr('disclaimer.trademark')}
      </p>
    </div>
  );
}
