import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NEVER_CACHE_PATH_PREFIXES, strategyForUrl } from '../../src/sw';

test.describe('PWA (SCALE-002)', () => {
  test('installability + quiet affordance (manifest + sw)', async ({ page, request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    const body = await manifest.json();
    expect(body.display).toBe('standalone');
    expect(body.icons?.length).toBeGreaterThanOrEqual(2);

    const sw = await request.get('/sw.js');
    expect(sw.status()).toBe(200);
    const swText = await sw.text();
    expect(swText).toMatch(/ccaf-pwa-v1/);

    await page.goto('/');
    // Quiet affordance: install button only when beforeinstallprompt fires — not an interstitial.
    await expect(page.locator('[data-testid="pwa-install-interstitial"]')).toHaveCount(0);
    await expect(page.getByTestId('locale-switcher')).toBeVisible();
  });

  test('strategy map + never-cache list', async () => {
    expect(strategyForUrl('/_next/static/x.js')).toBe('cache-first');
    expect(strategyForUrl('/')).toBe('stale-while-revalidate');
    expect(strategyForUrl('/api/catalog')).toBe('network-first');
    for (const p of NEVER_CACHE_PATH_PREFIXES) {
      expect(strategyForUrl(p)).toBe('bypass');
    }
  });

  test('offline banner honest; exam start refused offline', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    const caps = await page.getByTestId('offline-caps').textContent();
    expect(caps).toMatch(/"grading":false/);
    expect(caps).toMatch(/"tutor":false/);
    expect(caps).toMatch(/"checkout":false/);

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/live connection|offline/i);
      await dialog.accept();
    });
    // Try begin exam if the button exists
    const begin = page.getByRole('button', { name: /begin exam|start.*exam|timed mock/i }).first();
    if (await begin.count()) {
      await begin.click();
      await expect(page).toHaveURL(/\/$/);
    }
    await context.setOffline(false);
  });

  test('checkout/webhook routes bypass the worker', async () => {
    expect(strategyForUrl('/checkout')).toBe('bypass');
    expect(strategyForUrl('/api/webhooks/paddle')).toBe('bypass');
    expect(strategyForUrl('/api/exam/grade')).toBe('bypass');
  });

  test('kill flag + no store artifacts', async () => {
    const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
    expect(sw).toMatch(/PURGE_AND_UNREGISTER/);
    expect(existsSync(join(process.cwd(), 'ios'))).toBe(false);
    const offline = readFileSync(join(process.cwd(), 'src/lib/offline.ts'), 'utf8');
    expect(offline).toMatch(/free_question_cap|pickFreeSubset/);
    expect(offline).toMatch(/analyticsAllowed/);
  });

  test('reconnect sync endpoint idempotent', async ({ request }) => {
    const payload = {
      answers: [
        {
          clientId: 'e2e-dedupe-1',
          sittingId: 'sit-1',
          itemId: 'Q1',
          selectedKey: 'C',
          elapsedMs: 1000,
          queuedAt: new Date().toISOString(),
        },
      ],
    };
    const a = await request.post('/api/offline/sync', { data: payload });
    expect(a.status()).toBe(200);
    const aj = await a.json();
    expect(aj.syncedClientIds).toContain('e2e-dedupe-1');
    const b = await request.post('/api/offline/sync', { data: payload });
    const bj = await b.json();
    expect(bj.syncedClientIds).toContain('e2e-dedupe-1');
  });
});
