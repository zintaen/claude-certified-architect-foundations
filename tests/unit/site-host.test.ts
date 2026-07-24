import { afterEach, describe, expect, it, vi } from 'vitest';

describe('site host / cutover flag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults SITE_URL / origin to ccaf when NEXT_PUBLIC_SITE_URL unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const { DEFAULT_SITE_ORIGIN, siteOrigin, LIVE_SITE_HOST } = await import('../../src/lib/site');
    expect(DEFAULT_SITE_ORIGIN).toBe('https://ccaf.cyberskill.world');
    expect(LIVE_SITE_HOST).toBe('ccaf.cyberskill.world');
    expect(siteOrigin()).toBe('https://ccaf.cyberskill.world');
  });

  it('honors NEXT_PUBLIC_SITE_URL when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://practice.cyberskill.world/');
    const { siteOrigin } = await import('../../src/lib/site');
    expect(siteOrigin()).toBe('https://practice.cyberskill.world');
  });

  it('HOST_CUTOVER_REDIRECT defaults off', async () => {
    vi.stubEnv('HOST_CUTOVER_REDIRECT', '');
    const { hostCutoverRedirectEnabled } = await import('../../src/lib/site');
    expect(hostCutoverRedirectEnabled()).toBe(false);
  });

  it('HOST_CUTOVER_REDIRECT=on enables cutover', async () => {
    vi.stubEnv('HOST_CUTOVER_REDIRECT', 'on');
    const { hostCutoverRedirectEnabled } = await import('../../src/lib/site');
    expect(hostCutoverRedirectEnabled()).toBe(true);
  });

  it('HOST_CUTOVER_REDIRECT=off stays disabled', async () => {
    vi.stubEnv('HOST_CUTOVER_REDIRECT', 'off');
    const { hostCutoverRedirectEnabled } = await import('../../src/lib/site');
    expect(hostCutoverRedirectEnabled()).toBe(false);
  });
});
