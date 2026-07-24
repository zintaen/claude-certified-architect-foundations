import { describe, it, expect } from 'vitest';
import {
  PSEO_CONFIG,
  PSEO_INTENTS,
  allPseoPaths,
  intentCopy,
  internalLinks,
  schemaFor,
  pseoPath,
} from '@/lib/pseo';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { indexedPaths } from '@/lib/urlContract';

describe('GROWTH-001 pseo unit', () => {
  it('three intents only; paths under /exams/[code]', () => {
    expect(PSEO_INTENTS).toHaveLength(3);
    for (const p of allPseoPaths()) {
      expect(p).toMatch(/^\/exams\/[^/]+\/(practice-exam|practice-questions|free-mock-test)$/);
      expect(p).not.toMatch(/\/exams\/ccaf\//);
    }
  });

  it('minFreeItems <= free cap range', () => {
    expect(PSEO_CONFIG.minFreeItems).toBeGreaterThanOrEqual(1);
    expect(PSEO_CONFIG.minFreeItems).toBeLessThanOrEqual(40);
  });

  it('intent copy is distinct', () => {
    const a = intentCopy('practice-exam', 'X');
    const b = intentCopy('practice-questions', 'X');
    const c = intentCopy('free-mock-test', 'X');
    expect(a.angle).not.toBe(b.angle);
    expect(b.angle).not.toBe(c.angle);
    expect(a.h1).not.toBe(c.h1);
  });

  it('internal links mesh includes siblings + exams index', () => {
    const links = internalLinks('ccdv-f', 'practice-exam');
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain('/exams');
    expect(hrefs).toContain(pseoPath('ccdv-f', 'practice-questions'));
    expect(hrefs).toContain('/exams/ccdv-f');
  });

  it('schema FAQ only when faqs provided', () => {
    const empty = schemaFor(
      { examCode: 'x', intent: 'practice-exam', indexable: true, reasons: [], freeItemsShown: 0 },
      { title: 't', faqs: [], itemStems: [] }
    );
    expect(empty).toEqual([]);
    const withFaq = schemaFor(
      { examCode: 'x', intent: 'practice-exam', indexable: true, reasons: [], freeItemsShown: 0 },
      { title: 't', faqs: [{ q: 'Q?', a: 'A' }], itemStems: ['stem'] }
    );
    expect(JSON.stringify(withFaq)).toMatch(/FAQPage/);
    expect(JSON.stringify(withFaq)).toMatch(/ItemList/);
  });

  it('urlContract includes pseo paths', () => {
    const indexed = indexedPaths();
    expect(indexed.some((p) => p.includes('/practice-exam'))).toBe(true);
  });

  it('playbook + launch checklist threshold step', () => {
    expect(existsSync(join(process.cwd(), 'docs/seo/pseo-playbook.md'))).toBe(true);
    const playbook = readFileSync(join(process.cwd(), 'docs/seo/pseo-playbook.md'), 'utf8');
    expect(playbook).toMatch(/Index threshold/i);
    expect(playbook).toMatch(/Measurement loop/i);
    const checklist = readFileSync(join(process.cwd(), 'docs/launch-checklist.md'), 'utf8');
    expect(checklist).toMatch(/pSEO threshold|PSEO_MIN_FREE_ITEMS/);
  });

  it('anti-spam: no request-time LLM in pseo pages', () => {
    for (const rel of [
      'src/lib/pseo.ts',
      'src/components/PseoIntentPage.tsx',
      'src/app/exams/[code]/practice-exam/page.tsx',
    ]) {
      const text = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(text).not.toMatch(/openai|anthropic\.ai|generateText|TUTOR_API/);
    }
  });
});
