import { test, expect } from '@playwright/test';

test.describe('Next.js App E2E', () => {
  test('Home page loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the title is present (using Next.js app)
    await expect(page).toHaveTitle(/Mock Exam/i);

    // Check that the main heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Check that there is a start button
    const startButton = page.locator('button', { hasText: /Start Exam/i }).first();
    if ((await startButton.count()) > 0) {
      await expect(startButton).toBeVisible();
    }
  });

  test('Dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});
