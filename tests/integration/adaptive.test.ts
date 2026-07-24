import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('LEARN-002 adaptive integration scaffolding', () => {
  it('drill plan API classified write', () => {
    expect(classify('/api/drill/plan', 'POST')).toBe('write');
  });

  it('practice page has adaptive entry + focused-on copy', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/practice/page.tsx'), 'utf8');
    expect(src).toMatch(/adaptive-drill/);
    expect(src).toMatch(/Focused on/);
    expect(src).toMatch(/drill_started/);
  });

  it('engine accepts itemIds plan', () => {
    const src = readFileSync(join(process.cwd(), 'src/hooks/useExamEngine.ts'), 'utf8');
    expect(src).toMatch(/itemIds/);
  });

  it('premium gate on API', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/drill/plan/route.ts'), 'utf8');
    expect(src).toMatch(/premium_required/);
    expect(src).toMatch(/enforcementOn/);
  });

  it('analytics events; no per-question correctness props', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/drill_started/);
    expect(src).toMatch(/drill_completed/);
    const block = src.slice(src.indexOf('drill_started'), src.indexOf('drill_completed') + 60);
    expect(block).not.toMatch(/correct:/);
  });

  it('fence: free single-domain drill untouched; no LLM', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/adaptive.ts'), 'utf8');
    expect(src).not.toMatch(/openai|@ai-sdk|generateText/i);
    const practice = readFileSync(join(process.cwd(), 'src/app/practice/page.tsx'), 'utf8');
    expect(practice).toMatch(/Drill a single domain/);
  });
});
