/**
 * i18n config (SCALE-001). English root URLs stay untouched; routed locales use /[locale]/...
 */
import enCatalog from './en.json';
import viCatalog from './vi.json';
import { SITE_URL } from '@/lib/site';

export { SITE_URL };

export const DEFAULT_LOCALE = 'en' as const;

/** Shipped locales including implicit English at root. */
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locales with dedicated `/[locale]/...` routes (English stays on root URLs). */
export const ROUTED_LOCALES = ['vi'] as const;
export type RoutedLocale = (typeof ROUTED_LOCALES)[number];

/**
 * Expansion ladder from the monetization plan (documentation of intent).
 * First shipped wave: Vietnamese only.
 */
export const LOCALE_LADDER = [
  'vi',
  'es',
  'pt-BR',
  'hi',
  'id',
  'ja',
  'ko',
  'zh',
  'ar',
  'fr',
  'de',
] as const;

/** Marketing paths localized in wave 1 (indexed). */
export const LOCALIZED_MARKETING_PATHS = [
  '',
  '/about',
  '/terms',
  '/privacy',
  '/acceptable-use',
  '/refunds',
] as const;

/** Runtime (noindex) localized surfaces. */
export const LOCALIZED_RUNTIME_PATHS = ['/practice'] as const;

type Catalog = Record<string, string>;

const catalogs: Record<Locale, Catalog> = {
  en: stripMeta(enCatalog as Record<string, unknown>),
  vi: stripMeta(viCatalog as Record<string, unknown>),
};

function stripMeta(raw: Record<string, unknown>): Catalog {
  const out: Catalog = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isRoutedLocale(value: string): value is RoutedLocale {
  return (ROUTED_LOCALES as readonly string[]).includes(value);
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const missingByLocale = new Map<string, number>();

export function missingTranslationCount(locale?: Locale): number {
  if (locale) return missingByLocale.get(locale) ?? 0;
  let total = 0;
  for (const n of missingByLocale.values()) total += n;
  return total;
}

export function resetMissingTranslationCounts(): void {
  missingByLocale.clear();
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const primary = catalogs[locale]?.[key];
  if (primary !== undefined) return interpolate(primary, vars);
  const fallback = catalogs.en[key];
  if (fallback !== undefined) {
    missingByLocale.set(locale, (missingByLocale.get(locale) ?? 0) + 1);
    if (isDev && !isTest) {
      return `⟦MISSING:${locale}:${key}⟧${interpolate(fallback, vars)}`;
    }
    return interpolate(fallback, vars);
  }
  missingByLocale.set(locale, (missingByLocale.get(locale) ?? 0) + 1);
  if (isDev && !isTest) return `⟦MISSING:${locale}:${key}⟧`;
  return key;
}

export function createTranslator(locale: Locale): TranslateFn {
  return (key, vars) => t(locale, key, vars);
}

export function legalSensitiveKeys(): readonly string[] {
  const meta = (enCatalog as { _meta?: { legalSensitiveKeys?: string[] } })._meta;
  return meta?.legalSensitiveKeys ?? [];
}

export type LocaleReview = {
  reviewer: string;
  date: string;
  source_hash: string;
  legal_pages: string;
};

export function localeReview(locale: Locale): LocaleReview | null {
  if (locale === 'en') return null;
  const raw = locale === 'vi' ? (viCatalog as { _review?: LocaleReview }) : null;
  return raw?._review ?? null;
}

/** Prefix path for a routed locale; English keeps the root path. */
export function localizePath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'en') return normalized === '' ? '/' : normalized;
  if (normalized === '/') return `/${locale}`;
  return `/${locale}${normalized}`;
}

/** Strip leading routed locale for switching back to English root. */
export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (isRoutedLocale(parts[0])) {
    const rest = parts.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname.replace(/\/$/, '') || '/';
}

export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  locale: Locale,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Soft coexistence with PAY-002: format money when currency is known;
 * otherwise return a localized unavailable string (never invent a price).
 */
export function formatMoney(
  locale: Locale,
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (amount == null || !currency) return t(locale, 'format.priceUnavailable');
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export const LOCALE_STORAGE_KEY = 'cyberskill.locale.preferred';
export const LOCALE_BANNER_DISMISS_KEY = 'cyberskill.locale.banner.dismissed';

/** hreflang + x-default cluster for an English-root path. */
export function hreflangLanguages(englishPath: string): Record<string, string> {
  const enUrl =
    !englishPath || englishPath === '/'
      ? `${SITE_URL}/`
      : `${SITE_URL}${englishPath.startsWith('/') ? englishPath : `/${englishPath}`}`;
  const languages: Record<string, string> = {
    en: enUrl,
    'x-default': enUrl,
  };
  for (const loc of ROUTED_LOCALES) {
    languages[loc] = `${SITE_URL}${localizePath(loc, englishPath || '/')}`;
  }
  return languages;
}

export function catalogMessageKeys(locale: Locale = 'en'): string[] {
  return Object.keys(catalogs[locale]).sort();
}
