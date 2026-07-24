import {
  LOCALIZED_MARKETING_PATHS,
  LOCALIZED_RUNTIME_PATHS,
  ROUTED_LOCALES,
  localizePath,
  type RoutedLocale,
} from '@/i18n/config';

/** Additive indexed locale paths (SEO-001 contract extension). */
export function localeIndexedPaths(): string[] {
  const out: string[] = [];
  for (const loc of ROUTED_LOCALES) {
    for (const p of LOCALIZED_MARKETING_PATHS) {
      out.push(localizePath(loc, p || '/'));
    }
  }
  return out;
}

/** Additive runtime locale paths (noindex). */
export function localeRuntimePaths(): string[] {
  const out: string[] = [];
  for (const loc of ROUTED_LOCALES) {
    for (const p of LOCALIZED_RUNTIME_PATHS) {
      out.push(localizePath(loc, p));
    }
  }
  return out;
}

export function englishPathFromLocalized(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if ((ROUTED_LOCALES as readonly string[]).includes(parts[0])) {
    const rest = parts.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname.replace(/\/$/, '') || '/';
}

export function routedLocaleFromPath(pathname: string): RoutedLocale | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && (ROUTED_LOCALES as readonly string[]).includes(seg)) {
    return seg as RoutedLocale;
  }
  return null;
}
