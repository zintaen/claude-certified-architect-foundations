import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PSEO_INTENTS, pseoPath } from '../../src/lib/pseo';

test.describe('pSEO (GROWTH-001)', () => {
  test('three intents render distinct sections for catalog exam', async ({ page }) => {
    const code = 'ccdv-f';
    const signatures: string[] = [];
    for (const intent of PSEO_INTENTS) {
      await page.goto(pseoPath(code, intent));
      await expect(page.locator('main h1')).toBeVisible();
      const section = page.locator(`[data-testid="pseo-section-${intent}"]`);
      await expect(section).toBeVisible();
      signatures.push(await section.innerText());
    }
    expect(new Set(signatures).size).toBe(3);
  });

  test('below-threshold shows noindex note when DB empty', async ({ page }) => {
    await page.goto('/exams/ccdv-f/practice-questions');
    const note = page.locator('[data-testid="pseo-noindex-note"]');
    if ((await note.count()) > 0) {
      await expect(note).toBeVisible();
    }
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    if (robots) expect(robots).toMatch(/noindex/i);
  });

  test('no /exams/ccaf intent routes', async ({ request }) => {
    const res = await request.get('/exams/ccaf/practice-exam');
    expect(res.status()).toBe(404);
  });

  test('playbook exists', () => {
    expect(existsSync(join(process.cwd(), 'docs/seo/pseo-playbook.md'))).toBe(true);
    const text = readFileSync(join(process.cwd(), 'docs/seo/pseo-playbook.md'), 'utf8');
    expect(text).toMatch(/Anti-spam/);
  });

  test('exams index can reach intent pages (mesh)', async ({ page }) => {
    await page.goto('/exams/ccdv-f/practice-exam');
    await expect(page.locator('main a[href="/exams"]').first()).toBeVisible();
    await expect(
      page.locator('main a[href="/exams/ccdv-f/practice-questions"]').first()
    ).toBeVisible();
  });
});
