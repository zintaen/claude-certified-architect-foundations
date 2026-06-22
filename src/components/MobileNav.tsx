'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, BookOpen, Trophy, Info, Coffee, GraduationCap, HelpCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type NavItem = {
  href: string;
  label: string;
  icon: typeof BookOpen;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Practice', icon: BookOpen },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/guide', label: 'Guide', icon: GraduationCap },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/about', label: 'About', icon: Info },
  { href: 'https://buymeacoffee.com/zintaen', label: 'Support', icon: Coffee, external: true },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border text-foreground/70 hover:text-primary hover:border-ring transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="absolute right-0 top-0 h-full w-[82%] max-w-xs surface-panel border-l border-border shadow-[0_0_40px_var(--glow)] flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Menu</span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border text-foreground/70 hover:text-primary hover:border-ring transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 px-3 py-4">
                {NAV_ITEMS.map(({ href, label, icon: Icon, external }) =>
                  external ? (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground/85 hover:bg-[var(--overlay-subtle)] hover:text-primary transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  ) : (
                    <Link
                      key={href}
                      href={href}
                      onClick={close}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground/85 hover:bg-[var(--overlay-subtle)] hover:text-primary transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  )
                )}
              </nav>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                <span className="text-sm text-muted">Theme</span>
                <ThemeToggle />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
