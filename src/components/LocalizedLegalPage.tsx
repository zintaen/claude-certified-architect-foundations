import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  createTranslator,
  hreflangLanguages,
  isRoutedLocale,
  localeReview,
  type RoutedLocale,
} from '@/i18n/config';

type LegalSlug = 'terms' | 'privacy' | 'acceptable-use' | 'refunds';

const LEGAL_META: Record<LegalSlug, { enTitle: string; enHref: string; englishPath: string }> = {
  terms: { enTitle: 'Terms of Service', enHref: '/terms', englishPath: '/terms' },
  privacy: { enTitle: 'Privacy Policy', enHref: '/privacy', englishPath: '/privacy' },
  'acceptable-use': {
    enTitle: 'Acceptable Use Policy',
    enHref: '/acceptable-use',
    englishPath: '/acceptable-use',
  },
  refunds: { enTitle: 'Refunds', enHref: '/refunds', englishPath: '/refunds' },
};

export function LocalizedLegalPage({ locale, slug }: { locale: RoutedLocale; slug: LegalSlug }) {
  const tr = createTranslator(locale);
  const review = localeReview(locale);
  const meta = LEGAL_META[slug];
  const useEnglishNotice =
    !review ||
    review.legal_pages === 'english_with_notice' ||
    review.legal_pages !== 'counsel_reviewed';

  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid={`locale-legal-${slug}`}>
      {useEnglishNotice ? (
        <p
          className="text-sm border border-border rounded-md px-3 py-2 bg-panel/60 mb-6"
          data-testid="legal-english-notice"
        >
          {tr('legal.englishNotice')}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight mb-4" lang="en">
        {meta.enTitle}
      </h1>
      <div className="prose-legal space-y-4 text-foreground/90 leading-relaxed" lang="en">
        <p>
          This page remains in English for locale <strong>{locale}</strong> until a counsel-reviewed
          translation is published. The binding legal text is the English version at{' '}
          <Link href={meta.enHref} className="text-primary underline">
            {meta.enHref}
          </Link>
          .
        </p>
        <p>
          CyberSkill Software Solutions Consultancy and Development JSC operates these practice-exam
          sites. By using the service you agree to the English Terms, Privacy Policy, Acceptable Use
          Policy, and Refunds policy linked above.
        </p>
      </div>
    </div>
  );
}

export function legalMetadata(locale: string, slug: LegalSlug): Metadata {
  if (!isRoutedLocale(locale)) return {};
  const meta = LEGAL_META[slug];
  return {
    title: `${meta.enTitle} | CyberSkill`,
    alternates: {
      canonical: `/${locale}${meta.englishPath}`,
      languages: hreflangLanguages(meta.englishPath),
    },
  };
}

export function assertRoutedLocale(raw: string): RoutedLocale {
  if (!isRoutedLocale(raw)) notFound();
  return raw;
}
