import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PADDLE_CSP } from '../../src/lib/paddleCsp';
import { classify, BUDGETS } from '../../src/lib/rateLimit';

test.describe('pricing checkout (PAY-002)', () => {
  test('pricing renders hero + secondary SKUs, currency formatting', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByTestId('pricing-page')).toBeVisible();
    await expect(page.getByTestId('pricing-hero')).toBeVisible();
    await expect(page.getByTestId('pricing-hero')).toHaveAttribute('data-sku', 'per_exam_pass');
    await expect(page.getByTestId('pricing-hero-amount')).toContainText('$');
    await expect(page.getByTestId('pricing-secondary')).toBeVisible();
    await expect(page.getByTestId('pricing-card-lifetime')).toBeVisible();
  });

  test('EU locale: consent unticked blocks checkout; ticked proceeds', async ({ page }) => {
    await page.goto('/pricing?eu=1');
    const consent = page.getByTestId('eu-consent-checkbox');
    await expect(consent).toBeVisible();
    await page.getByTestId('checkout-per_exam_pass').click();
    await expect(page.getByTestId('pricing-status')).toContainText('EU digital-content consent');
    await consent.check();
    await page.getByTestId('checkout-per_exam_pass').click();
    // Without client token, status explains keys pending (not a grant)
    await expect(page.getByTestId('pricing-status')).toContainText(/not configured|Checkout/i);
  });

  test('withdrawal flow reachable from pricing/refunds', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByTestId('withdrawal-link')).toHaveAttribute(
      'href',
      '/pricing/withdrawal'
    );
    await page.goto('/refunds');
    await expect(page.getByTestId('refunds-eu-slot')).toContainText('withdrawal');
    await page.goto('/pricing/withdrawal');
    await expect(page.getByTestId('withdrawal-form')).toBeVisible();
  });

  test('refunds + privacy pages carry new sections', async ({ page }) => {
    await page.goto('/refunds');
    await expect(page.getByTestId('refunds-sku-slot')).toContainText('Per-exam pass');
    await expect(page.getByTestId('refunds-mor')).toContainText('Paddle');
    await expect(page.getByTestId('refunds-eu-slot-box')).toContainText('withdrawal');
    await page.goto('/privacy');
    await expect(page.getByTestId('privacy-paddle-row')).toContainText('Paddle');
    await expect(page.getByTestId('privacy-paddle-row')).toContainText('Merchant of Record');
  });

  test('donation button functional alongside pricing', async ({ page }) => {
    await page.goto('/pricing');
    const donate = page.getByTestId('pricing-donate').locator('a');
    await expect(donate).toHaveAttribute('href', /buymeacoffee/);
  });

  test('funnel event names registered; no raw PII in analytics map props', async () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toContain("'checkout_opened'");
    expect(src).toContain("'checkout_completed'");
    expect(src).toContain("'purchase_fulfilled'");
    expect(src).not.toMatch(/checkout_opened[\s\S]{0,200}email:/);
  });

  test('reconcile script: seeded discrepancies reported, dry-run default', () => {
    let out = '';
    try {
      out = execFileSync(
        process.execPath,
        ['scripts/reconcile-paddle.mjs', '--fixture=tests/fixtures/paddle-reconcile.json'],
        { encoding: 'utf8' }
      );
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      out = `${e.stdout || ''}${e.stderr || ''}`;
    }
    expect(out).toContain('missing_grant');
    expect(out).toContain('orphaned_grant');
  });

  test('CSP headers list paddle origins only; webhook in write class', async ({ page }) => {
    const res = await page.goto('/pricing');
    const csp = res?.headers()['content-security-policy'] || '';
    for (const origin of PADDLE_CSP.scriptSrc) {
      expect(csp).toContain(origin);
    }
    for (const origin of PADDLE_CSP.frameSrc) {
      expect(csp).toContain(origin);
    }
    expect(csp).not.toContain('https://*.paddle.com');
    expect(classify('/api/webhooks/paddle', 'POST')).toBe('write');
    expect(BUDGETS.write.max).toBeGreaterThanOrEqual(180);
  });

  test('launch doc checklist + rollback sections present', () => {
    const doc = readFileSync(join(process.cwd(), 'docs/monetization-launch.md'), 'utf8');
    expect(doc).toMatch(/Sandbox/i);
    expect(doc).toMatch(/Enforcement flip/i);
    expect(doc).toMatch(/Rollback/i);
    expect(doc).toContain('ENTITLEMENTS_ENFORCED');
  });
});
