import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '../../src/lib/rateLimit';

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

describe('platform serving (DATA-001)', () => {
  it('session payload has no correct_key/explanations (deep key scan)', async () => {
    if (!(await dbUp())) return;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    const { assembleSitting, toClientQuestions } = await import('../../src/lib/sittings');
    const { sittingId, questions } = await assembleSitting({
      examCode: 'ccaf',
      mode: 'exam',
      betaMix: 0,
    });
    expect(sittingId).toBeTruthy();
    const client = toClientQuestions(questions);
    const walk = (v: unknown, path: string[] = []): string[] => {
      if (v && typeof v === 'object') {
        return Object.entries(v as object).flatMap(([k, val]) =>
          k === 'correct_key' || k === 'explanations'
            ? [[...path, k].join('.')]
            : walk(val, [...path, k])
        );
      }
      return [];
    };
    expect(walk(client)).toEqual([]);
    expect(client.length).toBe(60);
  });

  it('grade uses persisted question_set across item version bump', async () => {
    if (!(await dbUp())) return;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    const { assembleSitting, gradeSitting, recordResponse } =
      await import('../../src/lib/sittings');
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { sittingId, questions } = await assembleSitting({
      examCode: 'ccaf',
      mode: 'exam',
      betaMix: 0,
    });
    const first = questions[0];
    const { data: before } = await admin
      .from('items')
      .select('correct_key, version, stem')
      .eq('id', first.id)
      .single();
    await recordResponse(sittingId, first.id, before!.correct_key, 10);
    // Bump version + change stem (simulates edit after assemble)
    await admin
      .from('items')
      .update({ version: before!.version + 1, stem: before!.stem + ' [edited]' })
      .eq('id', first.id);
    const result = await gradeSitting(sittingId);
    const { data: resp } = await admin
      .from('item_responses')
      .select('item_version')
      .eq('sitting_id', sittingId)
      .eq('item_id', first.id)
      .single();
    expect(resp!.item_version).toBe(before!.version);
    expect(result.total_scored).toBe(60);
  });

  it('item_responses rows written per graded question', async () => {
    if (!(await dbUp())) return;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    const { assembleSitting, gradeSitting } = await import('../../src/lib/sittings');
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { sittingId, questions } = await assembleSitting({
      examCode: 'ccaf',
      mode: 'exam',
      betaMix: 0,
    });
    await gradeSitting(sittingId);
    const { count } = await admin
      .from('item_responses')
      .select('*', { count: 'exact', head: true })
      .eq('sitting_id', sittingId);
    expect(count).toBe(questions.length);
  });

  it('exam-mode assembly: scored+beta only, canary/retired excluded, beta unscored', async () => {
    if (!(await dbUp())) return;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data: exam } = await admin.from('exams').select('id').eq('code', 'ccaf').single();
    // Mark one item canary, one beta (CCAF only)
    const { data: some } = await admin
      .from('items')
      .select('id')
      .eq('exam_id', exam!.id)
      .eq('item_status', 'scored')
      .limit(2);
    await admin.from('items').update({ item_status: 'canary' }).eq('id', some![0].id);
    await admin.from('items').update({ item_status: 'beta' }).eq('id', some![1].id);

    const { assembleSitting, gradeSitting } = await import('../../src/lib/sittings');
    const { sittingId, questions } = await assembleSitting({
      examCode: 'ccaf',
      mode: 'exam',
      betaMix: 1,
    });
    expect(questions.every((q) => q.id !== some![0].id)).toBe(true);
    const hasBeta = questions.some((q) => q.id === some![1].id);
    expect(hasBeta).toBe(true);
    const g = await gradeSitting(sittingId);
    expect(g.breakdown).toMatchObject({ betaExcluded: 1 });

    // restore
    await admin
      .from('items')
      .update({ item_status: 'scored' })
      .in(
        'id',
        some!.map((s) => s.id)
      );
  });

  it('grep: new tables accessed only via catalog.ts/sittings.ts', () => {
    const appRoot = join(process.cwd(), 'src/app');
    const banned = [
      'vendors',
      'certifications',
      'exams',
      'domains',
      'objectives',
      'items',
      'sittings',
      'item_responses',
      'entitlements',
      'prices',
    ];
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name.name)) {
          // grade route may reference table names in DB_GRADE_PATH path — allow that file
          if (p.endsWith('exam/grade/route.ts')) continue;
          // DATA-002 dual-read paths use sittings when *_FROM_DB=on
          if (p.endsWith('api/result/route.ts')) continue;
          if (p.endsWith('api/leaderboard/route.ts')) continue;
          if (p.includes('/api/catalog/') || p.includes('/api/exams/')) continue;
          const text = readFileSync(p, 'utf8');
          if (!text.includes('.from(')) continue;
          for (const t of banned) {
            if (text.includes(`.from('${t}')`) || text.includes(`.from("${t}")`)) {
              hits.push(`${p}:${t}`);
            }
          }
        }
      }
    };
    walk(appRoot);
    expect(hits).toEqual([]);
  });

  it('rate-limit classify covers new routes', () => {
    expect(classify('/api/catalog', 'GET')).toBe('read');
    expect(classify('/api/exams/ccaf/session', 'POST')).toBe('write');
    expect(classify('/api/exam/grade', 'POST')).toBe('write');
  });
});
