import { test, expect } from '@playwright/test';
import { INDEPENDENCE_DISCLAIMER } from '../../src/lib/legal';

test.describe('disclaimer (LEGAL-001)', () => {
  test('home and about render disclaimer; about has #trademarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('independence-disclaimer').first()).toContainText(
      INDEPENDENCE_DISCLAIMER.slice(0, 40)
    );

    await page.goto('/about');
    await expect(page.locator('#trademarks')).toBeVisible();
    await expect(page.locator('#trademarks')).toContainText('trademark');
  });

  test('page titles contain CyberSkill', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CyberSkill/);
  });
});
