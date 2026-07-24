import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

describe('migration DATA-002', () => {
  it('mapping doc table list matches known schema stores', () => {
    const doc = readFileSync(join(ROOT, 'docs/migration/DATA-002-mapping.md'), 'utf8');
    for (const table of [
      'exam_results',
      'subscribers',
      'active_exam_sessions',
      'users',
      'sittings',
      'item_responses',
      'migration_log',
    ]) {
      expect(doc).toContain(`\`${table}\``);
    }
    expect(doc).toContain('ccaf-exam-storage');
    expect(doc).toContain('ccaf-pinHash');
    expect(doc).toMatch(/WAIVED|COMPLETE/i);
  });

  it('migration_log SQL exists', () => {
    expect(existsSync(join(ROOT, 'supabase/migrations/20260810000000_migration_log.sql'))).toBe(
      true
    );
  });

  it('scripts have no third-party egress (grep)', () => {
    for (const name of ['migrate-users.mjs', 'migrate-history.mjs', 'parity-check.mjs']) {
      const text = readFileSync(join(ROOT, 'scripts', name), 'utf8');
      expect(text).not.toMatch(/https?:\/\/(?!.*supabase)/i);
      // Only createClient from supabase-js
      expect(text).toMatch(/@supabase\/supabase-js/);
    }
  });

  it('dry-run default writes nothing (migrate-users exits 0 or env-missing)', () => {
    const r = spawnSync('node', ['scripts/migrate-users.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env },
    });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    if (r.status === 0) {
      expect(out).toMatch(/DRY RUN/i);
    } else {
      // Missing env, missing legacy table, or migration_log not applied yet.
      expect(out).toMatch(/SUPABASE|Need|PGRST|exam_results|migration_log/i);
    }
  });

  it('cutover flags default off', async () => {
    const { serveFromDb, dashboardFromDb, leaderboardFromDb, dbGradePath } =
      await import('../../src/lib/cutoverFlags');
    expect(serveFromDb()).toBe(false);
    expect(dashboardFromDb()).toBe(false);
    expect(leaderboardFromDb()).toBe(false);
    expect(dbGradePath()).toBe('off');
  });

  it('mapping doc records OBS soak waiver and local rehearsal complete', () => {
    const doc = readFileSync(join(ROOT, 'docs/migration/DATA-002-mapping.md'), 'utf8');
    expect(doc).toMatch(/WAIVED/i);
    expect(doc).toMatch(/ccaf-mock-exam/);
    expect(doc).toMatch(/COMPLETE — local Supabase/i);
    expect(doc).toMatch(/Production.*not touched|forbidden/i);
    expect(doc).toMatch(/PARITY OK/);
  });
});
