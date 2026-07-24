/**
 * Canonical production origin for the practice product.
 * Apex cyberskill.world is the agency site — do not use it as product host.
 */
export const DEFAULT_SITE_ORIGIN = 'https://practice.cyberskill.world';
export const SITE_HOST = 'practice.cyberskill.world';
export const LEGACY_SITE_HOST = 'ccaf.cyberskill.world';

/** Prefer NEXT_PUBLIC_SITE_URL when set (Vercel / local override); else practice host. */
export function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return fromEnv || DEFAULT_SITE_ORIGIN;
}

/** Build-time / module default — same as siteOrigin() for Next bundling. */
export const SITE_URL = siteOrigin();
