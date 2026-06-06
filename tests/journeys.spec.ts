import { test, expect } from '@playwright/test';

test.describe('CCAF E2E Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the root before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('i18n Switcher updates DOM text', async ({ page }) => {
    // Check English
    await expect(page.locator('h1[data-i18n="hero.title"]')).toHaveText('Claude Certified Architect');
    
    // Switch to Spanish
    await page.locator('#lang-selector').selectOption('es');
    await expect(page.locator('h1[data-i18n="hero.title"]')).toHaveText('Arquitecto Certificado de Claude');
    
    // Switch back
    await page.locator('#lang-selector').selectOption('en');
    await expect(page.locator('h1[data-i18n="hero.title"]')).toHaveText('Claude Certified Architect');
  });

  test('Untimed Practice Flow', async ({ page }) => {
    // Set question count to 1 for quick E2E testing
    await page.evaluate(() => {
      (document.getElementById('opt-count') as HTMLInputElement).value = '1';
    });
    
    // Click Start Practice
    await page.locator('#btn-practice').click();

    // Verify exam view is visible
    await expect(page.locator('#view-running')).toBeVisible();
    await expect(page.locator('#timer')).toContainText('untimed');

    // Answer the only question
    const firstOption = page.locator('.opt').first();
    await firstOption.click();

    // Verify it is checked
    await expect(firstOption).toHaveClass(/sel/);
    
    // Set up dialog handler before clicking submit
    page.on('dialog', dialog => dialog.accept());

    // Submit exam
    await page.locator('#btn-submit').click();
    
    // It should now show the results
    await expect(page.locator('#view-result')).toBeVisible();
    
    // Review button should be visible since we finished it
    await expect(page.locator('#btn-review')).toBeVisible();
  });

  test('State Management & Palette Rendering', async ({ page }) => {
    // Set question count to 2
    await page.evaluate(() => {
      (document.getElementById('opt-count') as HTMLInputElement).value = '2';
    });

    await page.locator('#btn-practice').click();
    await expect(page.locator('#view-running')).toBeVisible();

    // Answer the first question
    await page.locator('.opt').first().click();

    // Flag the question
    await page.locator('#flag-box').check();
    
    // The first palette button should be flagged
    const paletteBtn = page.locator('#palette button').first();
    
    // The first palette button should now be answered AND flagged
    await expect(paletteBtn).toHaveClass(/answered/);
    await expect(paletteBtn).toHaveClass(/flagged/);
  });

  test('Leitner Flashcard System', async ({ page }) => {
    // Assert due count is displayed correctly
    await expect(page.locator('#fc-due-count')).toBeVisible();
    
    // Start Flashcards
    await page.locator('#btn-flashcard').click();
    await expect(page.locator('#view-flashcard')).toBeVisible();
    
    // Answer the flashcard (instant feedback)
    await page.locator('.r-opt').first().click();
    
    // Assert explanation is revealed
    await expect(page.locator('.why').first()).toBeVisible();
    
    // Assert "Next Card" button appears
    const nextBtn = page.locator('#fc-btn-next');
    await expect(nextBtn).toBeVisible();
    
    // Click Next
    await nextBtn.click();
  });
});
