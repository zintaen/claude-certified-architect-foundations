import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ROUTED_LOCALES,
  hreflangLanguages,
  isRoutedLocale,
  type RoutedLocale,
} from '@/i18n/config';
import { englishPathFromLocalized } from '@/lib/i18nPaths';

type Props = { params: Promise<{ locale: string }>; children: React.ReactNode };

export function generateStaticParams() {
  return ROUTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isRoutedLocale(locale)) return {};
  const englishPath = '/';
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: hreflangLanguages(englishPath),
    },
  };
}

export default async function LocaleLayout({ params, children }: Props) {
  const { locale } = await params;
  if (!isRoutedLocale(locale)) notFound();
  void englishPathFromLocalized(`/${locale as RoutedLocale}`);
  return <>{children}</>;
}
