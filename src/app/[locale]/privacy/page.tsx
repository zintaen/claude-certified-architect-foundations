import type { Metadata } from 'next';
import {
  LocalizedLegalPage,
  assertRoutedLocale,
  legalMetadata,
} from '@/components/LocalizedLegalPage';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, 'privacy');
}

export default async function Page({ params }: Props) {
  const { locale: raw } = await params;
  const locale = assertRoutedLocale(raw);
  return <LocalizedLegalPage locale={locale} slug="privacy" />;
}
