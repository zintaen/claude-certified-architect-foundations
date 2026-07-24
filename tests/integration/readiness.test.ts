import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('LEARN-001 readiness integration scaffolding', () => {
  it('API rate-classified read', () => {
    expect(classify('/api/readiness', 'GET')).toBe('read');
  });

  it('dashboard mounts panel; methodology page exists', () => {
    const dash = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
    expect(dash).toMatch(/ReadinessPanel/);
    expect(existsSync(join(process.cwd(), 'src/app/methodology/page.tsx'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'docs/methodology.md'))).toBe(true);
  });

  it('methodology has no per-item stats; covers exclusions', () => {
    const doc = readFileSync(join(process.cwd(), 'docs/methodology.md'), 'utf8');
    expect(doc.toLowerCase()).toMatch(/exclusion/);
    expect(doc.toLowerCase()).toMatch(/not a prediction/);
    expect(doc).not.toMatch(/item_id\s*=/);
    const pub = readFileSync(join(process.cwd(), 'src/app/methodology/page.tsx'), 'utf8');
    expect(pub.toLowerCase()).toMatch(/not a prediction/);
    expect(pub).not.toMatch(/per-item statistics published/i);
  });

  it('events band-only (no score in props type)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/readiness_viewed/);
    expect(src).toMatch(/readiness_locked_viewed/);
    const block = src.slice(
      src.indexOf('readiness_viewed'),
      src.indexOf('readiness_locked_viewed') + 80
    );
    expect(block).not.toMatch(/score:/);
  });

  it('API gates with premium_required payload', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/readiness/route.ts'), 'utf8');
    expect(src).toMatch(/premium_required/);
    expect(src).toMatch(/enforcementOn/);
    expect(src).toMatch(/resolveAccess/);
  });

  it('fence: no LLM in readiness module; grading untouched import', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/readiness.ts'), 'utf8');
    expect(src).not.toMatch(/openai|anthropic|@ai-sdk|generateText/i);
  });
});
