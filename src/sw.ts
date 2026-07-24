/**
 * Service-worker strategy map (SCALE-002).
 * The runnable worker is `public/sw.js`; this module is the typed contract tests assert.
 */

export const SW_CACHE_VERSION = 'ccaf-pwa-v1';

export const CACHE_STATIC = `${SW_CACHE_VERSION}-static`;
export const CACHE_SHELLS = `${SW_CACHE_VERSION}-shells`;

/** Paths / prefixes the worker must never put in Cache Storage. */
export const NEVER_CACHE_PATH_PREFIXES = [
  '/api/exam/grade',
  '/api/entitlements',
  '/api/tutor',
  '/api/webhooks',
  '/api/offline/sync',
  '/checkout',
  '/api/paddle',
] as const;

export const NEVER_CACHE_PAYLOAD_HINTS = [
  'explanations',
  'entitlement',
  'correct_key',
  'answer_key',
] as const;

export type FetchStrategy = 'cache-first' | 'stale-while-revalidate' | 'network-first' | 'bypass';

export function strategyForUrl(url: string): FetchStrategy {
  let path: string;
  try {
    path = new URL(url, 'https://practice.cyberskill.world').pathname;
  } catch {
    return 'bypass';
  }

  for (const prefix of NEVER_CACHE_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return 'bypass';
  }

  if (path.startsWith('/api/')) return 'network-first';

  if (
    path.startsWith('/_next/static/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(path)
  ) {
    return 'cache-first';
  }

  // HTML / app shells
  if (path === '/' || !path.includes('.')) return 'stale-while-revalidate';

  return 'network-first';
}

export function isPwaEnabledFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const v = (env.NEXT_PUBLIC_PWA_ENABLED ?? env.PWA_ENABLED ?? 'on').toLowerCase();
  return v !== 'off' && v !== '0' && v !== 'false';
}
