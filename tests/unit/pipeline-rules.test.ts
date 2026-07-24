import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  reviewItem,
  runReviewAuto,
  assemblePrompt,
  RULEBOOK,
  buildSpecMatrix,
  loadConfig,
  pValue,
  pointBiserial,
  promotionDecision,
  degradationFlag,
} from '../../tools/item-pipeline/pipeline.mjs';

const ROOT = process.cwd();

function baseItem(over: Record<string, unknown> = {}) {
  return {
    draft_id: 'd1',
    stem: 'Which architecture choice best fits agent coordination under partial failure?',
    options: [
      { key: 'A', text: 'Single unbounded agent.' },
      { key: 'B', text: 'Specialized sub-agents with structured reports.' },
      { key: 'C', text: 'Average conflicting outputs.' },
      { key: 'D', text: 'Disable all tools.' },
    ],
    correct_key: 'B',
    cognitive: 'application',
    ...over,
  };
}

describe('pipeline-rules (CONTENT-002)', () => {
  it('all-of-the-above rejected', () => {
    const item = baseItem({
      options: [
        { key: 'A', text: 'One approach' },
        { key: 'B', text: 'Another approach' },
        { key: 'C', text: 'A third approach' },
        { key: 'D', text: 'All of the above' },
      ],
      correct_key: 'D',
    });
    expect(reviewItem(item, { cognitive: 'application' }).findings).toContain(
      'all_or_none_forbidden'
    );
  });

  it('cueing heuristics: length leak detected', () => {
    const item = baseItem({
      options: [
        { key: 'A', text: 'Short' },
        {
          key: 'B',
          text: 'A much longer option that spells out the entire correct architecture in unnecessary detail for cueing',
        },
        { key: 'C', text: 'Also short' },
        { key: 'D', text: 'Tiny' },
      ],
      correct_key: 'B',
    });
    expect(reviewItem(item, { cognitive: 'application' }).findings).toContain('length_cueing');
  });

  it('single-correct-option check', () => {
    const item = baseItem({
      options: [
        { key: 'A', text: 'One', correct: true },
        { key: 'B', text: 'Two', correct: true },
        { key: 'C', text: 'Three' },
        { key: 'D', text: 'Four' },
      ],
      correct_key: 'A',
    });
    expect(reviewItem(item, { cognitive: 'application' }).findings).toContain('not_single_correct');
  });

  it('bloom mismatch flagged against matrix target', () => {
    const item = baseItem({ cognitive: 'recall' });
    expect(reviewItem(item, { cognitive: 'analysis' }).findings).toContain('bloom_mismatch');
  });

  it('reviser cap -> rejected_auto with findings', () => {
    const bad = baseItem({
      options: [
        { key: 'A', text: 'x' },
        { key: 'B', text: 'All of the above forever' },
        { key: 'C', text: 'y' },
        { key: 'D', text: 'z' },
      ],
      correct_key: 'B',
    });
    const out = runReviewAuto([bad], [{ cognitive: 'application' }], 1, (item) => item);
    expect(out[0].status).toBe('rejected_auto');
    expect(out[0].findings.length).toBeGreaterThan(0);
    expect(out[0].reviser_iterations).toBe(1);
  });

  it('prompt assembler: allowlist only (poisoned fixture excluded)', () => {
    const poisoned = 'RECALLED LIVE EXAM QUESTION: secret stem XYZ';
    const prompt = assemblePrompt({
      blueprintText: 'Official blueprint outline only.',
      rulebook: RULEBOOK,
      target: { domain: 'X', objective: 'Y', cognitive: 'application' },
    });
    expect(prompt).toContain('Official blueprint outline only.');
    expect(prompt).toContain('ITEM WRITING RULEBOOK');
    expect(prompt).not.toContain(poisoned);
  });

  it('matrix proportionality + objective coverage + cognitive mix', () => {
    const bp = readFileSync(join(ROOT, 'docs/blueprints/ccaf-blueprint.md'), 'utf8');
    const cfg = {
      targets: { totalItems: 10 },
      cognitiveMix: { recall: 0.2, application: 0.6, analysis: 0.2 },
    };
    const matrix = buildSpecMatrix(cfg, bp);
    expect(matrix.domains.length).toBe(5);
    const weightSum = matrix.domains.reduce((s: number, d: { weight: number }) => s + d.weight, 0);
    expect(weightSum).toBe(100);
    const recalls = matrix.targets.filter(
      (t: { cognitive: string }) => t.cognitive === 'recall'
    ).length;
    expect(recalls).toBeGreaterThan(0);
    // Every objective under Learning objectives should be covered when feasible
    const learnSection = bp.split('## Learning objectives')[1] || '';
    const objs = [...learnSection.matchAll(/^- (.+)$/gm)].map((m) => m[1].trim());
    expect(objs.length).toBeGreaterThan(5);
    for (const o of objs) {
      expect(matrix.targets.some((t: { objective: string }) => t.objective === o)).toBe(true);
    }
  });

  it('p-value and point-biserial hand-checked fixtures', () => {
    const responses = [
      { is_correct: true },
      { is_correct: true },
      { is_correct: false },
      { is_correct: true },
    ];
    expect(pValue(responses)).toBe(0.75);

    // Hand-checked: flags [1,1,0,0], totals [3,2,1,0]
    // meanCorrect=(3+2)/2=2.5, meanWrong=(1+0)/2=0.5
    // meanTotal=1.5, sd=sqrt(((1.5)^2*2+(0.5)^2*2)/3)=sqrt(5/3)≈1.291
    // rpb = ((2.5-0.5)/sd)*sqrt(0.5*0.5) ≈ 0.7746
    const flags = [true, true, false, false];
    const totals = [3, 2, 1, 0];
    const r = pointBiserial(flags, totals)!;
    expect(r).toBeGreaterThan(0.77);
    expect(r).toBeLessThan(0.78);
  });

  it('promotion gate: minResponses + bounds; degradation -> revise, no auto-retire', () => {
    const bounds = {
      minResponses: 30,
      pValueMin: 0.2,
      pValueMax: 0.85,
      pointBiserialMin: 0.15,
    };
    expect(
      promotionDecision({ response_count: 10, p_value: 0.5, point_biserial: 0.4 }, bounds).promote
    ).toBe(false);
    expect(
      promotionDecision({ response_count: 40, p_value: 0.5, point_biserial: 0.4 }, bounds).promote
    ).toBe(true);
    const deg = degradationFlag({ response_count: 40, p_value: 0.05, point_biserial: 0.4 }, bounds);
    expect(deg?.verdict).toBe('revise');
    expect(deg?.notes).not.toMatch(/retire/i);
  });

  it('prohibited vendor refused; skipSimilarity refused', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pipe-cfg-'));
    const goodBp = join(ROOT, 'docs/blueprints/ccaf-blueprint.md');
    const banned = {
      examCode: 'x',
      vendor: { key: 'comptia', ai_generation_policy: 'prohibited' },
      blueprintDoc: 'docs/blueprints/ccaf-blueprint.md',
      corpusRef: 'corpus-ccaf-v1',
      targets: { totalItems: 2 },
      cognitiveMix: { recall: 0.5, application: 0.5, analysis: 0 },
      model: { generate: 'm', explain: 'm' },
      betaMixRatio: 1,
      maxUsd: 10,
      maxReviserIterations: 1,
      promotion: { minResponses: 30, pValueMin: 0.2, pValueMax: 0.85, pointBiserialMin: 0.15 },
    };
    const bannedPath = join(dir, 'banned.json');
    writeFileSync(bannedPath, JSON.stringify(banned));
    expect(() => loadConfig(ROOT, bannedPath)).toThrow(/prohibits AI generation/);

    const skip = {
      ...banned,
      vendor: { key: 'anthropic', ai_generation_policy: 'permitted' },
      skipSimilarity: true,
    };
    const skipPath = join(dir, 'skip.json');
    writeFileSync(skipPath, JSON.stringify(skip));
    expect(() => loadConfig(ROOT, skipPath)).toThrow(/similarity gate cannot be skipped/);

    const poison = {
      ...banned,
      vendor: { key: 'anthropic', ai_generation_policy: 'permitted' },
      blueprintDoc: 'docs/PROVENANCE.md',
    };
    writeFileSync(join(dir, 'poison.json'), JSON.stringify(poison));
    expect(() => loadConfig(ROOT, join(dir, 'poison.json'))).toThrow(/not allowlisted/);
    rmSync(dir, { recursive: true, force: true });
    void goodBp;
  });
});
