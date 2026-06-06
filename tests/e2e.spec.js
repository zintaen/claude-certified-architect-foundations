import { test, expect } from '@playwright/test';

test('App should load and display start button', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CCAF/);
  
  const startBtn = page.locator('#btn-start');
  await expect(startBtn).toBeVisible();
});
