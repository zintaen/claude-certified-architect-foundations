'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

const THEME_EVENT = 'ccaf-themechange';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || 'light';
    setTheme(current);
    setMounted(true);

    // Keep every toggle instance (header + exam topbar) in sync.
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail;
      if (next === 'light' || next === 'dark') setTheme(next);
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('ccaf-theme', next);
    } catch {
      // localStorage may be unavailable (private mode); theme still applies for this session.
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }));
  };

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      suppressHydrationWarning
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="min-h-11 min-w-11 w-11 h-11 sm:w-9 sm:h-9 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-md border border-border text-foreground/70 hover:text-primary hover:border-ring transition-colors"
    >
      {mounted && isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
