import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

test.describe('AEO (GROWTH-002)', () => {
  test('llms.txt is catalog-derived with disclaimer', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/CyberSkill/i);
    expect(text).toMatch(/independent|not affiliated/i);
    expect(text).toMatch(/ccdv-f|ccao-f|ccar-p|ccaf/);
    expect(text).not.toMatch(/\/api\/tutor/);
  });

  test('robots enumerates AI agents and disallows /api/', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/GPTBot|ClaudeBot|PerplexityBot/i);
    expect(text).toMatch(/Disallow: \/api\//);
  });

  test('exam landing has fact box + answer block', async ({ page }) => {
    await page.goto('/exams/ccdv-f');
    await expect(page.locator('[data-testid="aeo-fact-box"]')).toBeVisible();
    await expect(page.locator('[data-testid="aeo-answer-block"]')).toBeVisible();
    await expect(page.locator('[data-testid="aeo-fact-box"]')).toContainText(/verify|independent/i);
  });

  test('intent page has fact box', async ({ page }) => {
    await page.goto('/exams/ccdv-f/practice-exam');
    await expect(page.locator('[data-testid="aeo-fact-box"]')).toBeVisible();
  });

  test('playbook exists', () => {
    expect(existsSync(join(process.cwd(), 'docs/seo/aeo-playbook.md'))).toBe(true);
    const text = readFileSync(join(process.cwd(), 'docs/seo/aeo-playbook.md'), 'utf8');
    expect(text).toMatch(/best \[exam\] practice test/);
  });
});
