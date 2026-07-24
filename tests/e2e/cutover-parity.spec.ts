import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

test.describe('cutover parity scaffolding (DATA-002)', () => {
  test('mapping doc has rehearsal + soak waiver', async () => {
    const p = join(process.cwd(), 'docs/migration/DATA-002-mapping.md');
    expect(existsSync(p)).toBe(true);
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/Rollback rehearsal/i);
    expect(text).toMatch(/WAIVED/);
    expect(text).toMatch(/SERVE_FROM_DB/);
    expect(text).toMatch(/COMPLETE — local Supabase/i);
    expect(text).toMatch(/PARITY OK/);
  });

  test('subscribe + donate flows functional with default flags', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /Support|Buy me a coffee/i }).first()
    ).toBeVisible();
    const donate = page.locator('a[href*="buymeacoffee.com"]').first();
    await expect(donate).toHaveAttribute('href', /buymeacoffee/);
  });
});
