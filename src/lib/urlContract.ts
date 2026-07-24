/**
 * Frozen public URL contract (SEO-001). Single source shared with sitemap.ts.
 * Freeze date: 2026-07-24. Live host until LAUNCH: ccaf.cyberskill.world
 * (practice cutover gated by HOST_CUTOVER_REDIRECT — see docs/ops/practice-host-cutover.md).
 */
import { DOMAIN_ORDER } from '@/lib/domains';
import { catalogExamCodes } from '@/lib/examRegistry';
import { localeIndexedPaths, localeRuntimePaths } from '@/lib/i18nPaths';
import { allPseoPaths } from '@/lib/pseo';

export type UrlKind = 'indexed' | 'runtime';

export type UrlContractEntry = {
  path: string;
  kind: UrlKind;
  signature: { titleIncludes: string; h1Includes: string } | null;
};

/** Indexed marketing/content paths (also emitted by sitemap). */
export function indexedPaths(): string[] {
  const examCodes = catalogExamCodes().filter((c) => c !== 'ccaf');
  return [
    '',
    '/about',
    '/leaderboard',
    '/guide',
    '/sample-questions',
    '/faq',
    '/changelog',
    '/domains',
    '/exams',
    '/terms',
    '/privacy',
    '/acceptable-use',
    '/refunds',
    '/pricing',
    ...DOMAIN_ORDER.map((id) => `/domains/${id}`),
    ...DOMAIN_ORDER.map((id) => `/sample-questions/${id}`),
    ...examCodes.map((c) => `/exams/${c}`),
    ...examCodes.map((c) => `/exams/${c}/sample-questions`),
    ...allPseoPaths(),
    ...localeIndexedPaths(),
  ];
}

/** Runtime app states — not in sitemap; must carry noindex. */
export function runtimePaths(): string[] {
  const examCodes = catalogExamCodes().filter((c) => c !== 'ccaf');
  return [
    '/exam',
    '/practice',
    '/result',
    '/flashcards',
    '/score',
    '/dashboard',
    // Probe path for seo.contract_404 e2e (deliberately has no page).
    '/__seo_contract_404_probe',
    ...examCodes.flatMap((c) => [`/exams/${c}/practice`, `/exams/${c}/exam`]),
    ...localeRuntimePaths(),
  ];
}

function signatureFor(path: string): { titleIncludes: string; h1Includes: string } {
  // Prefer titleMatches; h1Includes empty when the first page h1 is shared nav chrome.
  if (path === '/' || path === '') {
    return { titleIncludes: 'CyberSkill', h1Includes: 'Claude' };
  }
  if (path === '/vi' || path.startsWith('/vi/')) {
    return { titleIncludes: 'CyberSkill', h1Includes: '' };
  }
  if (path === '/about') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/leaderboard') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/guide') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/faq') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/changelog') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/domains') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/sample-questions') {
    return { titleIncludes: 'CyberSkill', h1Includes: '' };
  }
  if (path === '/exams') return { titleIncludes: 'CyberSkill', h1Includes: '' };
  if (path === '/terms') return { titleIncludes: 'Terms', h1Includes: '' };
  if (path === '/privacy') return { titleIncludes: 'Privacy', h1Includes: '' };
  if (path === '/acceptable-use') {
    return { titleIncludes: 'Acceptable', h1Includes: '' };
  }
  if (path === '/refunds') return { titleIncludes: 'Refund', h1Includes: '' };
  if (path === '/pricing') return { titleIncludes: 'Pricing', h1Includes: '' };

  const domainMatch = path.match(/^\/domains\/([^/]+)$/);
  if (domainMatch) {
    return { titleIncludes: 'CyberSkill', h1Includes: '' };
  }
  if (path.startsWith('/sample-questions/')) {
    return { titleIncludes: 'CyberSkill', h1Includes: '' };
  }
  if (path.startsWith('/exams/')) {
    return { titleIncludes: 'CyberSkill', h1Includes: '' };
  }
  return { titleIncludes: 'CyberSkill', h1Includes: '' };
}

export const URL_CONTRACT: readonly UrlContractEntry[] = [
  ...indexedPaths().map((path) => ({
    path: path || '/',
    kind: 'indexed' as const,
    signature: signatureFor(path || '/'),
  })),
  ...runtimePaths().map((path) => ({
    path,
    kind: 'runtime' as const,
    signature: null,
  })),
];

/**
 * Permanent moves only (301). Empty at freeze — mechanism tested via fixtures.
 * Consumed by next.config.ts redirects() via seoRedirects.ts.
 */
export { REDIRECTS } from '@/lib/seoRedirects';

/** CCAF stays on legacy URLs; no /exams/ccaf mirrors. */
export const CCAF_EXAMS_NAMESPACE_FORBIDDEN = '/exams/ccaf';

export function pathClass(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'root';
  return seg.slice(0, 32);
}

export function isContractPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return URL_CONTRACT.some((e) => e.path === normalized || e.path === pathname);
}
