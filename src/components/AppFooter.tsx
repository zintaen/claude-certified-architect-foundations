'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

/** Site footer — hidden on immersive exam/flashcard sittings so the viewport is usable on phones. */
export default function AppFooter() {
  const pathname = usePathname();
  if (
    pathname === '/exam' ||
    pathname === '/flashcards' ||
    /^\/exams\/[^/]+\/(practice|exam)$/.test(pathname || '')
  ) {
    return null;
  }
  return <Footer />;
}
