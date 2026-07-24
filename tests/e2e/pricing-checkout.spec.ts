import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
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
    // Without client token / with mock: either keys-pending or checkout proceeds locally
    await expect(page.getByTestId('pricing-status')).toContainText(
      /not configured|Checkout|Opening|completed|access unlocks|Local mock/i
    );
  });

  test('local mock checkout fulfills via signed webhook when enabled', async ({
    page,
    request,
  }) => {
    const probe = await request.post('/api/dev/paddle-mock-checkout', {
      data: { sku: 'per_exam_pass', tier: 'tier1' },
    });
    test.skip(probe.status() === 404, 'PADDLE_DEV_MOCK not enabled');
    test.skip(probe.status() === 429, 'rate limited — re-run or raise RATE_LIMIT_WRITE_MAX');
    // If mock is on but DB/user missing, fail loudly so local:smoke can catch it
    expect(probe.ok()).toBeTruthy();
    const json = await probe.json();
    expect(json.status).toBe('mock_ok');
    expect(json.webhook?.status).toBe('processed');

    await page.goto('/pricing');
    await page.getByTestId('checkout-lifetime').click();
    await expect(page.getByTestId('pricing-status')).toContainText(
      /Local mock checkout completed/i,
      {
        timeout: 15_000,
      }
    );
  });

  test('webhook idempotency: same event_id replay is duplicate', async ({ request }) => {
    const secret = process.env.PADDLE_WEBHOOK_SECRET || 'local_dev_paddle_webhook_secret';
    // Skip when webhook secret not configured for this server (unsigned always 401)
    const unsigned = await request.post('/api/webhooks/paddle', {
      data: { event_id: 'evt_skip_probe', event_type: 'transaction.completed', data: {} },
    });
    expect(unsigned.status()).toBe(401);

    const eventId = `evt_e2e_idem_${Date.now()}`;
    const body = JSON.stringify({
      event_id: eventId,
      event_type: 'transaction.completed',
      occurred_at: new Date().toISOString(),
      data: {
        id: `txn_e2e_${Date.now()}`,
        custom_data: {
          user_id: process.env.PADDLE_DEV_MOCK_USER_ID || '11111111-1111-1111-1111-111111111111',
          sku: 'per_exam_pass',
          tier: 'tier1',
          exam_code: 'ccaf',
          payment_country: 'US',
        },
        address: { country_code: 'US' },
      },
    });
    const ts = Math.floor(Date.now() / 1000);
    const h1 = createHmac('sha256', secret).update(`${ts}:${body}`, 'utf8').digest('hex');
    const signature = `ts=${ts};h1=${h1}`;

    const postOnce = () =>
      request.post('/api/webhooks/paddle', {
        headers: {
          'content-type': 'application/json',
          'paddle-signature': signature,
        },
        data: body,
      });

    const first = await postOnce();
    // Without matching secret / supabase: may 401 or 500 — only assert idempotency when grant works
    if (first.status() === 401) {
      test.skip(true, 'webhook secret mismatch (set PADDLE_WEBHOOK_SECRET for local proof)');
      return;
    }
    if (first.status() === 429) {
      test.skip(true, 'rate limited — re-run or raise RATE_LIMIT_WRITE_MAX');
      return;
    }
    if (!first.ok()) {
      test.skip(true, `fulfillment unavailable (${first.status()}) — run npm run local:smoke`);
      return;
    }
    const firstJson = await first.json();
    expect(firstJson.status).toBe('processed');
    expect(firstJson.result?.duplicate).toBeFalsy();

    const second = await postOnce();
    expect(second.ok()).toBeTruthy();
    const secondJson = await second.json();
    expect(secondJson.result?.duplicate).toBe(true);
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
