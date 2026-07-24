import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function dbUp() {
  try {
    await fetch(`${URL}/rest/v1/`, {
      headers: {
        apikey:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      },
    });
    return true;
  } catch {
    return false;
  }
}

describe('CONTENT-003 multi-exam seed', () => {
  it('go-live flag flips one exam independently', async () => {
    if (!(await dbUp())) return;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data: before } = await admin.from('exams').select('code, status');
    const target = (before ?? []).find((e) => e.code === 'ccao-f');
    if (!target) return; // seed not run yet
    await admin.from('exams').update({ status: 'draft' }).eq('code', 'ccao-f');
    const { data: mid } = await admin.from('exams').select('code, status');
    expect(mid!.find((e) => e.code === 'ccao-f')!.status).toBe('draft');
    expect(mid!.find((e) => e.code === 'ccdv-f')?.status).not.toBe('draft');
    await admin.from('exams').update({ status: 'live' }).eq('code', 'ccao-f');
  });

  it('seed-multi-exam produces provisional launch cohort when DB up', async () => {
    if (!(await dbUp())) return;
    const env = {
      ...process.env,
      SUPABASE_URL: URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE,
      NEXT_PUBLIC_SUPABASE_URL: URL,
    };
    const r = spawnSync(process.execPath, ['scripts/seed-multi-exam.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    });
    if (r.status !== 0) {
      // Allow failure if CCAF vendor missing; surface stderr for diagnosis
      console.error(r.stderr);
    }
    expect(r.status).toBe(0);
    expect(existsSync(join(process.cwd(), 'docs/launch/ccao-f-decision.md'))).toBe(true);

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    for (const code of ['ccao-f', 'ccdv-f', 'ccar-p']) {
      const { data: exam } = await admin.from('exams').select('id').eq('code', code).single();
      const { data: items } = await admin
        .from('items')
        .select('external_key, item_status, provenance')
        .eq('exam_id', exam!.id);
      expect((items ?? []).length).toBeGreaterThan(0);
      expect((items ?? []).every((i) => i.item_status === 'scored')).toBe(true);
      expect(
        (items ?? []).every(
          (i) => (i.provenance as { calibration?: string }).calibration === 'provisional'
        )
      ).toBe(true);
      const { count } = await admin
        .from('item_reviews')
        .select('*', { count: 'exact', head: true });
      expect(count ?? 0).toBeGreaterThan(0);
    }
    void readFileSync;
  });
});
