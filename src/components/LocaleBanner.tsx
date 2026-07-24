'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_BANNER_DISMISS_KEY, LOCALE_STORAGE_KEY, isRoutedLocale, t } from '@/i18n/config';

/**
 * Non-coercive Accept-Language suggestion (SCALE-001).
 * Never auto-redirects by IP; dismissible + persistent.
 */
export default function LocaleBanner() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const first = pathname.split('/').filter(Boolean)[0];
      if (first && isRoutedLocale(first)) return;
      if (localStorage.getItem(LOCALE_BANNER_DISMISS_KEY) === '1') return;
      if (localStorage.getItem(LOCALE_STORAGE_KEY) === 'vi') return;
      const al = navigator.language || '';
      if (al.toLowerCase().startsWith('vi')) {
        setVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(LOCALE_BANNER_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function accept() {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'vi');
      localStorage.setItem(LOCALE_BANNER_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      className="border-b border-border bg-panel/90 text-sm"
      data-testid="locale-banner"
      role="region"
      aria-label="Language suggestion"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 justify-between">
        <p className="text-foreground/90">{t('en', 'locale.bannerSuggest')}</p>
        <div className="flex items-center gap-2">
          <Link
            href="/vi"
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium min-h-11 inline-flex items-center"
            onClick={accept}
            data-testid="locale-banner-accept"
          >
            {t('en', 'locale.bannerAccept')}
          </Link>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-border min-h-11"
            onClick={dismiss}
            data-testid="locale-banner-dismiss"
          >
            {t('en', 'locale.bannerDismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
