import type { Metadata } from 'next';

/** Shared robots for runtime app-state routes (SEO-001). */
export const runtimeNoIndex: Metadata = {
  robots: { index: false, follow: false },
};
