/**
 * Canonical production origin for the practice product.
 * Until LAUNCH, production stays on ccaf.cyberskill.world.
 * Apex cyberskill.world is the agency site — do not use it as product host.
 */
export const DEFAULT_SITE_ORIGIN = 'https://ccaf.cyberskill.world';
export const LIVE_SITE_HOST = 'ccaf.cyberskill.world';

/** Target host after operator LAUNCH + HOST_CUTOVER_REDIRECT=on. */
export const PRACTICE_SITE_ORIGIN = 'https://practice.cyberskill.world';
export const PRACTICE_SITE_HOST = 'practice.cyberskill.world';

/** @deprecated Use LIVE_SITE_HOST until LAUNCH; kept for cutover middleware naming. */
export const LEGACY_SITE_HOST = LIVE_SITE_HOST;
/** @deprecated Use PRACTICE_SITE_HOST; only the cutover redirect target until LAUNCH. */
export const SITE_HOST = PRACTICE_SITE_HOST;

/**
 * When `on`, middleware 301s ccaf → practice (LAUNCH only).
 * Default / unset / any other value = off (production stays on ccaf).
 */
export function hostCutoverRedirectEnabled(): boolean {
  return (process.env.HOST_CUTOVER_REDIRECT || 'off').trim().toLowerCase() === 'on';
}

/** Prefer NEXT_PUBLIC_SITE_URL when set (Vercel / local override); else ccaf until LAUNCH. */
export function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return fromEnv || DEFAULT_SITE_ORIGIN;
}

/** Build-time / module default — same as siteOrigin() for Next bundling. */
export const SITE_URL = siteOrigin();
