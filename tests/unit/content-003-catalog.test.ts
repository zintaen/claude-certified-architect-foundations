import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EXAM_REGISTRY, catalogExamCodes } from '../../src/lib/examRegistry';
import { VENDOR_MARKS, TRADEMARK_NOTICE, INDEPENDENCE_DISCLAIMER } from '../../src/lib/legal';
import { indexedPaths, runtimePaths, URL_CONTRACT } from '../../src/lib/urlContract';
import {
  markProvisionalProvenance,
  shouldRecalibrateLaunchCohort,
  recalibrateVerdict,
} from '../../src/lib/launchCohort';

const ROOT = process.cwd();

describe('CONTENT-003 catalog', () => {
  it('blueprint files carry source URL + retrieval date + verification line', () => {
    for (const file of [
      'docs/blueprints/ccao-f-blueprint.md',
      'docs/blueprints/ccdv-f-blueprint.md',
      'docs/blueprints/ccar-p-blueprint.md',
      'docs/blueprints/ccaf-blueprint.md',
    ]) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      expect(text).toMatch(
        /claude\.com\/blog\/four-role-based-claude-certifications|anthropic\.com/
      );
      expect(text).toMatch(/2026-07-24/);
      expect(text).toMatch(/Verification/i);
    }
  });

  it('site_default pass thresholds labeled in registry', () => {
    for (const exam of EXAM_REGISTRY) {
      expect(exam.logistics.source_url).toBeTruthy();
      expect(exam.logistics.retrieved).toBeTruthy();
      if (exam.pass_threshold.basis === 'site_default') {
        expect(exam.pass_threshold.value).toBeGreaterThan(0);
      }
    }
  });

  it('VENDOR_MARKS includes three new exam names; disclaimer constant present', () => {
    const marks = VENDOR_MARKS.anthropic.marks.join(' ');
    expect(marks).toMatch(/CCAO-F/);
    expect(marks).toMatch(/CCDV-F/);
    expect(marks).toMatch(/CCAR-P/);
    expect(TRADEMARK_NOTICE).toMatch(/CCAO-F is a trademark/);
    expect(INDEPENDENCE_DISCLAIMER).toMatch(/independent practice-exam/);
  });

  it('urlContract/sitemap shared source includes new exam routes; no /exams/ccaf', () => {
    const indexed = indexedPaths();
    const runtime = runtimePaths();
    for (const code of catalogExamCodes()) {
      expect(indexed).toContain(`/exams/${code}`);
      expect(indexed).toContain(`/exams/${code}/sample-questions`);
      expect(runtime).toContain(`/exams/${code}/practice`);
      expect(runtime).toContain(`/exams/${code}/exam`);
    }
    expect(indexed.some((p) => p.startsWith('/exams/ccaf'))).toBe(false);
    expect(runtime.some((p) => p.startsWith('/exams/ccaf'))).toBe(false);
    const contractPaths = new Set(URL_CONTRACT.map((e) => (e.path === '/' ? '' : e.path)));
    for (const p of indexed) expect(contractPaths.has(p)).toBe(true);
  });

  it('sitemap.ts imports indexedPaths from urlContract', () => {
    const src = readFileSync(join(ROOT, 'src/app/sitemap.ts'), 'utf8');
    expect(src).toMatch(/indexedPaths/);
    expect(src).toMatch(/urlContract/);
  });

  it('runtime routes import CatalogExamRuntime (one-engine)', () => {
    for (const rel of [
      'src/app/exams/[code]/practice/page.tsx',
      'src/app/exams/[code]/exam/page.tsx',
    ]) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/CatalogExamRuntime/);
    }
  });

  it('launch checklist present', () => {
    const doc = readFileSync(join(ROOT, 'docs/launch-checklist.md'), 'utf8');
    expect(doc).toMatch(/ccao-f/);
    expect(doc).toMatch(/Pipeline run manifest/);
    expect(doc).toMatch(/Launch cohort decision/);
  });

  it('bootstrap: provisional recalibration mechanism', () => {
    const item = markProvisionalProvenance({
      provenance: { origin: { method: 'blueprint_generation' } },
    });
    expect(item.provenance.calibration).toBe('provisional');
    expect(shouldRecalibrateLaunchCohort({ responseCount: 30, minResponses: 30 })).toBe(true);
    expect(recalibrateVerdict({ provisional: true, statsOk: false })).toBe('revise');
    expect(recalibrateVerdict({ provisional: true, statsOk: true })).toBe('approved');
  });

  it('pipeline configs exist for three new exams', () => {
    for (const code of ['ccao-f', 'ccdv-f', 'ccar-p']) {
      expect(existsSync(join(ROOT, `tools/item-pipeline/configs/${code}.json`))).toBe(true);
    }
  });

  it('no monetization surfaces in CONTENT-003 exam pages', () => {
    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) walk(p, acc);
        else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p);
      }
      return acc;
    };
    const files = walk(join(ROOT, 'src/app/exams'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/checkout|entitlement|paywall|paddle/i);
    }
  });
});
