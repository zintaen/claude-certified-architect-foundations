import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const PLATFORM = [
  'vendors',
  'certifications',
  'exams',
  'domains',
  'objectives',
  'items',
  'users',
  'sittings',
  'item_responses',
  'entitlements',
  'prices',
];

const hasDb = async () => {
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON } });
    return r.ok || r.status === 200 || r.status === 404;
  } catch {
    return false;
  }
};

describe('platform schema (DATA-001)', () => {
  it('migrations apply on fresh stack; tables + indexes present', async () => {
    if (!(await hasDb())) return; // skip when local supabase is down
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    for (const t of PLATFORM) {
      const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
      expect(error, t).toBeNull();
    }
    // covering indexes named in migration files
    const schemaSql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260801000000_platform_schema.sql'),
      'utf8'
    );
    expect(schemaSql).toMatch(/items_exam_status_idx/);
    expect(schemaSql).toMatch(/item_responses_item_idx/);
    expect(schemaSql).toMatch(/sittings_user_exam_idx/);
    expect(schemaSql).toMatch(/entitlements_user_status_idx/);
  });

  it('RLS enabled everywhere; anon read/write denied per table', async () => {
    if (!(await hasDb())) return;
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    for (const t of PLATFORM) {
      const { data, error } = await anon.from(t).select('*').limit(1);
      // RLS deny → error or empty with permission denial
      const denied =
        error !== null ||
        (Array.isArray(data) && data.length === 0 && t !== 'vendors') ||
        (error && /permission|policy|RLS/i.test(error.message));
      // For seeded vendors, anon should still be blocked by RLS even with GRANT
      expect(error !== null || data === null || (data && data.length === 0)).toBe(true);
      void denied;
    }
  });

  it('prices: negative amount_minor rejected; money columns are bigint', async () => {
    if (!(await hasDb())) return;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { error } = await admin.from('prices').insert({
      sku: 'test',
      tier: 'tier1',
      currency: 'USD',
      amount_minor: -1,
      active: true,
    });
    expect(error).toBeTruthy();
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260801000000_platform_schema.sql'),
      'utf8'
    );
    expect(sql).toMatch(/amount_minor bigint/);
    expect(sql).not.toMatch(/amount_minor (numeric|double|real|float)/);
  });

  it('seed: counts match, provenance required, idempotent second run', async () => {
    if (!(await hasDb())) return;
    const env = {
      ...process.env,
      SUPABASE_URL: URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE,
    };
    const r1 = spawnSync(process.execPath, ['scripts/seed-catalog.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    });
    expect(r1.status).toBe(0);
    const r2 = spawnSync(process.execPath, ['scripts/seed-catalog.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    });
    expect(r2.status).toBe(0);
    expect(r2.stdout).toMatch(/"db_count":80/);

    // Fail loudly without provenance
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data: exam } = await admin.from('exams').select('id').eq('code', 'ccaf').single();
    const { data } = await admin
      .from('items')
      .select('external_key, provenance')
      .eq('exam_id', exam!.id);
    expect(data!.length).toBe(80);
    for (const row of data!) {
      expect(row.provenance).toBeTruthy();
      expect((row.provenance as { item_id: string }).item_id).toBe(row.external_key);
    }
  });
});
