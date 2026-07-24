import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('LEARN-004 study plan integration scaffolding', () => {
  it('API classified; no runtime LLM in studyPlan', () => {
    expect(classify('/api/plan', 'POST')).toBe('write');
    const src = readFileSync(join(process.cwd(), 'src/lib/studyPlan.ts'), 'utf8');
    expect(src).not.toMatch(/openai|fetch\(|generateText/i);
  });

  it('template provenance present', () => {
    const tpl = readFileSync(join(process.cwd(), 'src/data/plan-templates/ccaf.json'), 'utf8');
    expect(tpl).toMatch(/provenance/);
    expect(tpl).toMatch(/reviewer/);
  });

  it('plan page + migration', () => {
    expect(existsSync(join(process.cwd(), 'src/app/plan/page.tsx'))).toBe(true);
    expect(
      existsSync(join(process.cwd(), 'supabase/migrations/20260925000000_study_plans.sql'))
    ).toBe(true);
  });

  it('analytics events omit plan body', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/plan_created/);
    const block = src.slice(src.indexOf('plan_created'), src.indexOf('plan_week_completed') + 40);
    expect(block).not.toMatch(/theme:|guidance:/);
  });
});
