import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

describe('PAY-001 gating integration scaffolding', () => {
  it('entitlement_events migration is append-only shaped', () => {
    const p = join(ROOT, 'supabase/migrations/20260910000000_entitlement_events.sql');
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, 'utf8');
    expect(sql).toMatch(/entitlement_events/);
    expect(sql).toMatch(/revoke update, delete/i);
    expect(sql).toMatch(/kind in \('granted'/);
  });

  it('grant script dry-run default writes nothing without env', () => {
    const r = spawnSync(
      'node',
      ['scripts/grant-entitlement.mjs', '--email=t@example.com', '--sku=lifetime'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: '', NEXT_PUBLIC_SUPABASE_URL: '' },
      }
    );
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    expect(r.status).not.toBe(0);
    expect(out).toMatch(/SUPABASE|Need/i);
  });

  it('session route returns upgrade payload shape on FreeMockLimitError path (source)', () => {
    const src = readFileSync(join(ROOT, 'src/app/api/exams/[code]/session/route.ts'), 'utf8');
    expect(src).toMatch(/FreeMockLimitError/);
    expect(src).toMatch(/per_exam_pass/);
    expect(src).toMatch(/402/);
  });

  it('grade path strips explain when enforcement on (source gate)', () => {
    const src = readFileSync(join(ROOT, 'src/app/api/exam/grade/route.ts'), 'utf8');
    expect(src).toMatch(/includeExplanations/);
    expect(src).toMatch(/enforcementOn/);
  });

  it('donation surfaces untouched by entitlement semantics', () => {
    const footer = readFileSync(join(ROOT, 'src/components/Footer.tsx'), 'utf8');
    expect(footer).toMatch(/buymeacoffee/i);
    expect(footer).not.toMatch(/entitlement|sku|premium/i);
  });

  it('analytics map includes upgrade + gate events', () => {
    const src = readFileSync(join(ROOT, 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/upgrade_prompt_shown/);
    expect(src).toMatch(/upgrade_prompt_clicked/);
    expect(src).toMatch(/entitlement_gate_hit/);
  });
});
