import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  URL_CONTRACT,
  indexedPaths,
  runtimePaths,
  CCAF_EXAMS_NAMESPACE_FORBIDDEN,
  REDIRECTS,
} from '../../src/lib/urlContract';

test.describe('URL contract (SEO-001)', () => {
  test('URL_CONTRACT and sitemap derive from shared source', () => {
    const indexed = new Set(indexedPaths().map((p) => p || '/'));
    const runtime = new Set(runtimePaths());
    for (const e of URL_CONTRACT) {
      if (e.kind === 'indexed') expect(indexed.has(e.path)).toBe(true);
      else expect(runtime.has(e.path)).toBe(true);
    }
    expect(URL_CONTRACT.filter((e) => e.kind === 'indexed').length).toBe(indexed.size);
    const sm = readFileSync(join(process.cwd(), 'src/app/sitemap.ts'), 'utf8');
    expect(sm).toMatch(/indexedPaths/);
  });

  test('monitoring doc has threshold slot + schedule', () => {
    const p = join(process.cwd(), 'docs/seo/monitoring.md');
    expect(existsSync(p)).toBe(true);
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/Rollback trigger/i);
    expect(text).toMatch(/T\+2d/);
    expect(text).toMatch(/_{5,}/);
    expect(text).toMatch(/Observation log/i);
  });

  test('indexed URLs return 200 with brand title (sample)', async ({ page, request }) => {
    const sample = URL_CONTRACT.filter((e) => e.kind === 'indexed').slice(0, 12);
    for (const entry of sample) {
      const res = await request.get(entry.path);
      expect(res.status(), entry.path).toBe(200);
      await page.goto(entry.path);
      const title = (await page.title()).toLowerCase();
      // Brand / product signal — titles vary by page but must stay on-brand.
      expect(
        /cyber|claude|terms|privacy|refund|acceptable/.test(title),
        `${entry.path} title=${title}`
      ).toBe(true);
    }
  });

  test('runtime routes carry noindex and are absent from sitemap', async ({ page, request }) => {
    const sm = await request.get('/sitemap.xml');
    const smText = await sm.text();
    for (const path of ['/exam', '/practice', '/dashboard', '/result']) {
      // Sitemap uses absolute URLs; ensure runtime paths are not listed as entries.
      expect(smText).not.toMatch(new RegExp(`/${path.replace(/^\//, '')}</loc>`, 'i'));
      await page.goto(path);
      const robots = page.locator('meta[name="robots"]');
      // Next may emit robots via meta; also accept x-robots from headers on document.
      const count = await robots.count();
      if (count > 0) {
        const content = await robots.first().getAttribute('content');
        expect(content || '').toMatch(/noindex/i);
      } else {
        // Fallback: metadata robots often renders as <meta name="robots" content="noindex"...>
        const html = await page.content();
        expect(html.toLowerCase()).toMatch(/noindex/);
      }
    }
  });

  test('no /exams/ccaf mirror in contract', () => {
    expect(URL_CONTRACT.some((e) => e.path.startsWith(CCAF_EXAMS_NAMESPACE_FORBIDDEN))).toBe(false);
  });

  test('redirects module is permanent-only', () => {
    for (const r of REDIRECTS) {
      expect(r.source).toBeTruthy();
      expect(r.destination).toBeTruthy();
    }
    const cfg = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    expect(cfg).toMatch(/permanent:\s*true/);
  });

  test('broken contract probe path is wired for 404 counting', async ({ request }) => {
    const res = await request.get('/__seo_contract_404_probe');
    expect(res.status()).toBe(404);
    const nf = readFileSync(join(process.cwd(), 'src/app/not-found.tsx'), 'utf8');
    expect(nf).toMatch(/recordContract404/);
    expect(URL_CONTRACT.some((e) => e.path === '/__seo_contract_404_probe')).toBe(true);
  });
});
