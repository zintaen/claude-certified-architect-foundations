import { describe, it, expect } from 'vitest';
import {
  AI_CRAWLER_POLICY,
  buildLlmsTxt,
  catalogCodesForLlms,
  factBox,
  answerBlock,
} from '@/lib/aeo';
import { examByCode } from '@/lib/examRegistry';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('GROWTH-002 aeo unit', () => {
  it('llms.txt includes catalog exams + disclaimer stance', () => {
    const txt = buildLlmsTxt();
    expect(txt).toMatch(/independent/i);
    expect(txt).toMatch(/not affiliated/i);
    for (const code of catalogCodesForLlms()) {
      expect(txt).toContain(`(${code})`);
    }
    expect(txt).not.toMatch(/\/api\//);
    expect(txt).not.toMatch(/provenance|entitlement/i);
  });

  it('crawler policy enumerates agents', () => {
    expect(AI_CRAWLER_POLICY.length).toBeGreaterThan(3);
    expect(AI_CRAWLER_POLICY.some((a) => a.allow === 'none')).toBe(true);
    expect(AI_CRAWLER_POLICY.some((a) => a.allow === 'free_surfaces')).toBe(true);
  });

  it('fact box carries date + verify line', () => {
    const exam = examByCode('ccdv-f')!;
    const box = factBox(exam);
    expect(box.retrieved).toBeTruthy();
    expect(box.verifyLine).toMatch(/verify/i);
    expect(box.independenceLine).toMatch(/independent/i);
  });

  it('answer block model', () => {
    const b = answerBlock('Q?', 'A.');
    expect(b.question).toBe('Q?');
    expect(b.answer).toBe('A.');
  });

  it('playbook sections', () => {
    expect(existsSync(join(process.cwd(), 'docs/seo/aeo-playbook.md'))).toBe(true);
    const p = readFileSync(join(process.cwd(), 'docs/seo/aeo-playbook.md'), 'utf8');
    expect(p).toMatch(/Crawler policy/i);
    expect(p).toMatch(/Measurement/i);
    expect(p).toMatch(/observations/i);
  });

  it('no request-time LLM in aeo module', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/aeo.ts'), 'utf8');
    expect(src).not.toMatch(/openai|generateText|TUTOR_API/);
  });
});
