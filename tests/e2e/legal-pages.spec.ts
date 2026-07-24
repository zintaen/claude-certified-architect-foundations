import { test, expect } from '@playwright/test';

const LEGAL_PATHS = ['/terms', '/privacy', '/acceptable-use', '/refunds'] as const;

test.describe('legal pages (LEGAL-002)', () => {
  test('four legal routes 200 + footer links present on home and exam pages', async ({ page }) => {
    for (const path of LEGAL_PATHS) {
      const res = await page.goto(path);
      expect(res?.ok()).toBeTruthy();
      await expect(page.getByTestId('policy-meta')).toBeVisible();
    }

    await page.goto('/');
    const footer = page.getByTestId('footer-legal');
    await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(footer.getByRole('link', { name: 'Acceptable use' })).toHaveAttribute(
      'href',
      '/acceptable-use'
    );
    await expect(footer.getByRole('link', { name: 'Refunds' })).toHaveAttribute('href', '/refunds');

    // Immersive /exam hides AppFooter by design; catalog exam landing still shows it.
    await page.goto('/exams/ccao-f');
    await expect(
      page.getByTestId('footer-legal').getByRole('link', { name: 'Terms' })
    ).toBeVisible();
  });

  test('terms contains honor-code commitments', async ({ page }) => {
    await page.goto('/terms');
    const honor = page.getByTestId('honor-code');
    await expect(honor).toContainText('NDA-protected');
    await expect(honor).toContainText('candidate agreement');
    await expect(honor).toContainText('original works');
  });

  test('acceptable-use contains prohibitions + report channel', async ({ page }) => {
    await page.goto('/acceptable-use');
    const prohibitions = page.getByTestId('aup-prohibitions');
    await expect(prohibitions).toContainText('brain dumps');
    await expect(prohibitions).toContainText('Scraping');
    await expect(prohibitions).toContainText('credential sharing');
    await expect(prohibitions).toContainText('Reselling');
    await expect(page.getByTestId('aup-stance')).toContainText('not dumps');
    await expect(page.getByTestId('aup-report')).toContainText('bug reporter');
    await expect(page.getByTestId('aup-report')).toContainText('pull items pending review');
  });

  test('privacy contains data categories, sub-processors, frameworks, contact', async ({
    page,
  }) => {
    await page.goto('/privacy');
    const data = page.getByTestId('privacy-data');
    await expect(data).toContainText('Email');
    await expect(data).toContainText('PIN hash');
    await expect(data).toContainText('Exam sittings');
    await expect(data).toContainText('Leaderboard');
    await expect(data).toContainText('Newsletter');
    await expect(data).toContainText('telemetry');
    await expect(page.getByTestId('privacy-processors')).toContainText('Supabase');
    await expect(page.getByTestId('privacy-processors')).toContainText('Vercel');
    await expect(page.getByTestId('privacy-frameworks')).toContainText('Decree 356/2025');
    await expect(page.getByTestId('privacy-frameworks')).toContainText('GDPR');
    await expect(page.getByTestId('privacy-frameworks')).toContainText('CCPA');
    await expect(page.getByTestId('privacy-rights')).toContainText('info@cyberskill.world');
  });

  test('banner: accept persists, reject persists, no reappear after reload', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/');
    const banner = page.getByTestId('cookie-consent');
    await expect(banner).toBeVisible();

    await page.getByTestId('consent-reject').click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0);

    await context.clearCookies();
    await page.goto('/');
    await expect(page.getByTestId('cookie-consent')).toBeVisible();
    await page.getByTestId('consent-accept').click();
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0);
  });

  test('refunds page: donation line present, MoR + SKU terms', async ({ page }) => {
    await page.goto('/refunds');
    await expect(page.getByTestId('refunds-donations')).toContainText('non-refundable');
    await expect(page.getByTestId('refunds-paid')).toContainText('Paddle');
    await expect(page.getByTestId('refunds-sku-slot')).toContainText('Per-exam pass');
    await expect(page.getByTestId('refunds-eu-slot')).toContainText('withdrawal');
    await expect(page.getByTestId('refunds-mor')).toContainText('Merchant of Record');
  });

  test('policy pages render version + effective date', async ({ page }) => {
    for (const path of LEGAL_PATHS) {
      await page.goto(path);
      await expect(page.getByTestId('policy-meta')).toContainText(/Version 1\.\d/);
      await expect(page.getByTestId('policy-meta')).toContainText('Effective 2026-07-24');
    }
  });
});
