'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_STORAGE_KEY, localizePath, stripLocalePrefix, t, type Locale } from '@/i18n/config';
import { routedLocaleFromPath } from '@/lib/i18nPaths';

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'vi', label: 'Tiếng Việt' },
];

export default function LocaleSwitcher() {
  const pathname = usePathname() || '/';
  const current: Locale = routedLocaleFromPath(pathname) ?? 'en';
  const englishPath = stripLocalePrefix(pathname);

  function remember(locale: Locale) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="locale-switcher">
      <span className="text-xs font-bold uppercase tracking-widest text-muted">
        {t(current, 'locale.switcherLabel')}
      </span>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const href = localizePath(opt.locale, englishPath);
          const active = opt.locale === current;
          return (
            <Link
              key={opt.locale}
              href={href}
              hrefLang={opt.locale}
              onClick={() => remember(opt.locale)}
              className={`text-sm py-2 min-h-11 inline-flex items-center px-2 rounded-md transition-colors ${
                active
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-foreground/80 hover:text-primary'
              }`}
              data-testid={`locale-switch-${opt.locale}`}
              aria-current={active ? 'page' : undefined}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
