import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexedPaths, URL_CONTRACT } from '../../src/lib/urlContract';
import { ROUTED_LOCALES } from '../../src/i18n/config';

test.describe('i18n (SCALE-001)', () => {
  test('root English URLs remain; locale paths additive in contract', async ({ request }) => {
    const root = await request.get('/');
    expect(root.status()).toBe(200);
    const about = await request.get('/about');
    expect(about.status()).toBe(200);

    for (const loc of ROUTED_LOCALES) {
      expect(indexedPaths()).toContain(`/${loc}`);
      expect(indexedPaths()).toContain(`/${loc}/about`);
      const res = await request.get(`/${loc}`);
      expect(res.status(), `/${loc}`).toBe(200);
    }

    // English paths still present (not moved under /en)
    expect(URL_CONTRACT.some((e) => e.path === '/' || e.path === '')).toBe(true);
    expect(indexedPaths().some((p) => p === '/about')).toBe(true);
  });

  test('localized surfaces render; items English with label', async ({ page }) => {
    await page.goto('/vi');
    await expect(page.getByTestId('locale-home')).toBeVisible();
    await expect(
      page.getByTestId('locale-home').getByTestId('independence-disclaimer')
    ).toBeVisible();
    await expect(page.getByTestId('locale-trademark')).toBeVisible();

    await page.goto('/vi/practice');
    await expect(page.getByTestId('questions-in-english')).toBeVisible();
    await expect(page.locator('[lang="en"]').first()).toBeVisible();
  });

  test('legal-page policy: English legal + notice', async ({ page }) => {
    await page.goto('/vi/terms');
    await expect(page.getByTestId('legal-english-notice')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Terms of Service/i })).toBeVisible();
  });

  test('hreflang / canonical cluster on locale home', async ({ page }) => {
    await page.goto('/vi');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/vi\/?$/);
    const hreflang = page.locator('link[rel="alternate"][hreflang]');
    expect(await hreflang.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveCount(1);
  });

  test('banner dismissible; switcher persists; no IP redirect', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', { get: () => 'vi-VN' });
      localStorage.removeItem('cyberskill.locale.banner.dismissed');
      localStorage.removeItem('cyberskill.locale.preferred');
    });
    await page.goto('/');
    // Must stay on English root (no auto-redirect to /vi)
    expect(new URL(page.url()).pathname).toBe('/');
    const banner = page.getByTestId('locale-banner');
    await expect(banner).toBeVisible();
    await page.getByTestId('locale-banner-dismiss').click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('locale-banner')).toHaveCount(0);

    await expect(page.getByTestId('locale-switcher')).toBeVisible();
    await page.getByTestId('locale-switch-vi').click();
    await expect(page).toHaveURL(/\/vi\/?$/);
  });

  test('locale dimension helper + fences in source', async () => {
    const analytics = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(analytics).toMatch(/resolveLocaleDimension|locale:/);
    const playbook = readFileSync(join(process.cwd(), 'docs/i18n-playbook.md'), 'utf8');
    expect(playbook).toMatch(/questions in English|Questions in English/i);
    expect(playbook).toMatch(/english_with_notice/);
  });
});
