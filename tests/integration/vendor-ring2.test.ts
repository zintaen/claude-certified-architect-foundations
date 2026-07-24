import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  VENDOR_MARKS,
  composeIndependenceDisclaimer,
  composeTrademarkNotice,
  BANNED_DESCRIPTORS,
} from '../../src/lib/legal';
import { EXAM_REGISTRY, examByCode, catalogExamCodes } from '../../src/lib/examRegistry';
import { loadConfig } from '../../tools/item-pipeline/lib/config.mjs';

const ROOT = process.cwd();

const RING2 = ['aws-aif-c01', 'azure-ai-900', 'google-genai-leader'] as const;

describe('vendor ring-2 (SCALE-004)', () => {
  it('vendor-guidelines.md sections + dated sources per vendor', () => {
    const doc = readFileSync(join(ROOT, 'docs/legal/vendor-guidelines.md'), 'utf8');
    for (const vendor of ['AWS', 'Microsoft', 'Google']) {
      expect(doc).toMatch(new RegExp(`## ${vendor}`));
    }
    expect(doc).toMatch(/retrieved 2026-07-24|Retrieved.*2026-07-24/i);
    expect(doc).toMatch(/id="aws-ai-content-policy"|aws-ai-content-policy/);
    expect(doc).toMatch(/id="microsoft-ai-content-policy"|microsoft-ai-content-policy/);
    expect(doc).toMatch(/id="google-ai-content-policy"|google-ai-content-policy/);
    expect(doc).toMatch(/ai_generation_policy|permitted/i);
  });

  it('VENDOR_MARKS propagation + guard fixture for new marks', () => {
    expect(VENDOR_MARKS.aws.marks).toContain('AIF-C01');
    expect(VENDOR_MARKS.microsoft.marks).toContain('AI-900');
    expect(VENDOR_MARKS.google.marks).toContain('Generative AI Leader');
    const notice = composeTrademarkNotice();
    expect(notice).toMatch(/Amazon Web Services/);
    expect(notice).toMatch(/Microsoft Corporation/);
    expect(notice).toMatch(/Google LLC/);
    expect(composeIndependenceDisclaimer('aws')).toMatch(/Amazon Web Services/);
    expect(BANNED_DESCRIPTORS).toContain('official');

    // Brand guard script loads all mark arrays
    const guard = readFileSync(join(ROOT, 'scripts/check-brand-terms.mjs'), 'utf8');
    expect(guard).toMatch(/matchAll\(\/marks:/);
  });

  it('blueprint files: sources, dates, verification lines, no items', () => {
    for (const code of RING2) {
      const exam = examByCode(code)!;
      const bp = readFileSync(join(ROOT, exam.blueprintDoc), 'utf8');
      expect(bp).toMatch(/https?:\/\//);
      expect(bp).toMatch(/2026-07-24/);
      expect(bp).toMatch(/Verification pass/i);
      expect(bp.toLowerCase()).toMatch(/contains no exam questions|no exam questions/);
      expect(bp).not.toMatch(/\b(A|B|C|D)\.\s+All of the above/i);
    }
  });

  it('config policy cross-refs; prohibited fixture refused', () => {
    for (const code of RING2) {
      const cfg = JSON.parse(
        readFileSync(join(ROOT, `tools/item-pipeline/configs/${code}.json`), 'utf8')
      );
      expect(cfg.vendor.ai_generation_policy).toBe('permitted');
      expect(cfg._policy_finding).toMatch(/vendor-guidelines\.md#/);
      expect(() =>
        loadConfig(ROOT, join(ROOT, `tools/item-pipeline/configs/${code}.json`))
      ).not.toThrow();
    }
    expect(() =>
      loadConfig(ROOT, join(ROOT, 'tools/item-pipeline/configs/_fixture-prohibited.json'))
    ).toThrow(/prohibits AI generation/);
  });

  it('provenance + SME approval in run manifests; corpus attestations', () => {
    for (const code of RING2) {
      const runPath = join(ROOT, `tools/item-pipeline/runs/launch-${code}.json`);
      expect(existsSync(runPath)).toBe(true);
      const run = JSON.parse(readFileSync(runPath, 'utf8'));
      expect(run.examCode).toBe(code);
      expect(run.stages['sme-queue']?.status).toBe('ok');
      expect((run.items || []).length).toBeGreaterThan(0);
      const corpusDirs = [
        'docs/blueprints/corpus-aws-aif/manifest.md',
        'docs/blueprints/corpus-azure-ai-900/manifest.md',
        'docs/blueprints/corpus-google-genai-leader/manifest.md',
      ];
      for (const rel of corpusDirs) {
        const m = readFileSync(join(ROOT, rel), 'utf8');
        expect(m).toMatch(/legitimate_sources_only: attested/);
      }
    }
  });

  it('zero-component multi-vendor registry proof', () => {
    for (const code of RING2) {
      const exam = examByCode(code)!;
      expect(exam.vendorKey).not.toBe('anthropic');
      expect(catalogExamCodes()).toContain(code);
      expect(exam.landingHref).toBe(`/exams/${code}`);
      expect(exam.practiceHref).toBe(`/exams/${code}/practice`);
      // Shared pages — no per-vendor page components required
      expect(existsSync(join(ROOT, 'src/app/exams/[code]/page.tsx'))).toBe(true);
      expect(existsSync(join(ROOT, `src/app/exams/${code}/page.tsx`))).toBe(false);
    }
  });

  it('free surfaces without prices rows; later price row is additive', () => {
    for (const code of RING2) {
      const exam = examByCode(code)!;
      expect(exam.logistics.price_usd).toBeNull();
    }
    // Anthropic exams still have prices — ring-2 pricing is decoupled
    expect(examByCode('ccdv-f')!.logistics.price_usd).toBeGreaterThan(0);
  });

  it('fences: no CompTIA; no non-AI cloud certs in ring-2 configs', () => {
    const configs = readdirSync(join(ROOT, 'tools/item-pipeline/configs')).filter((f) =>
      f.endsWith('.json')
    );
    for (const f of configs) {
      if (f.startsWith('_')) continue;
      const cfg = JSON.parse(readFileSync(join(ROOT, 'tools/item-pipeline/configs', f), 'utf8'));
      expect(cfg.examCode).not.toMatch(/comptia|clf-c02|az-900$|ace$/i);
    }
    const codes = EXAM_REGISTRY.map((e) => e.code);
    expect(codes).not.toContain('comptia-a');
    // Claude surfaces still present
    expect(codes).toContain('ccaf');
    expect(codes).toContain('ccdv-f');
  });
});
