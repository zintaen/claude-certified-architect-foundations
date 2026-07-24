import { test, expect } from '@playwright/test';

test.describe('exams catalog (CONTENT-003)', () => {
  test('exams index lists live exams; ccaf links to legacy surface', async ({ page }) => {
    await page.goto('/exams');
    await expect(
      page.getByRole('heading', { name: /Claude certification practice/i })
    ).toBeVisible();
    const ccaf = page.getByRole('link', { name: /Architect — Foundations/i }).first();
    await expect(ccaf).toHaveAttribute('href', '/');
    await expect(page.getByTestId('independence-disclaimer')).toBeVisible();
  });

  test('landing logistics + disclaimer; no /exams/ccaf', async ({ page }) => {
    const res = await page.goto('/exams/ccaf');
    expect(res?.status()).toBe(404);

    await page.goto('/exams/ccao-f');
    await expect(page.getByRole('heading', { name: /Associate/i })).toBeVisible();
    await expect(page.getByTestId('exam-logistics')).toContainText('site default');
    await expect(page.getByTestId('exam-logistics')).toContainText('verify current details');
    await expect(page.getByTestId('independence-disclaimer')).toBeVisible();
  });
});
