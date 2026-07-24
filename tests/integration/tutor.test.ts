import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { classify, TUTOR_SUB_BUDGET } from '@/lib/rateLimit';

const ROOT = process.cwd();

describe('AI-001 tutor integration scaffolding', () => {
  it('tutor route is write-class + has sub-budget', () => {
    expect(classify('/api/tutor', 'POST')).toBe('write');
    expect(TUTOR_SUB_BUDGET.max).toBeLessThanOrEqual(50);
    const route = readFileSync(join(ROOT, 'src/app/api/tutor/route.ts'), 'utf8');
    expect(route).toMatch(/hitTutorSubBudget/);
    expect(route).toMatch(/premium_required/);
    expect(route).toMatch(/unavailable_during_exam/);
  });

  it('result page mounts TutorPanel post-grade only', () => {
    const page = readFileSync(join(ROOT, 'src/app/result/page.tsx'), 'utf8');
    expect(page).toMatch(/TutorPanel/);
    expect(page).toMatch(/surface="result"/);
    expect(page).toMatch(/examInProgress=\{false\}/);
  });

  it('exam page does not mount TutorPanel (integrity)', () => {
    const exam = readFileSync(join(ROOT, 'src/app/exam/page.tsx'), 'utf8');
    expect(exam).not.toMatch(/TutorPanel/);
  });

  it('migration file exists', () => {
    expect(
      existsSync(join(ROOT, 'supabase/migrations/20260930000000_tutor_usage_and_cache.sql'))
    ).toBe(true);
  });

  it('grep: tutor writes confined to tutor tables in tutor.ts', () => {
    const src = readFileSync(join(ROOT, 'src/lib/tutor.ts'), 'utf8');
    const fromMatches = [...src.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
    for (const t of fromMatches) {
      expect(['tutor_usage', 'tutor_cache', 'items']).toContain(t);
    }
  });
});
