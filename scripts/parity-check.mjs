#!/usr/bin/env node
/**
 * DATA-002: parity check between legacy exam_results and new sittings.
 * Exit 0 if clean; non-zero if discrepancies. Dry read-only.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: legacy, error: e1 } = await db
    .from('exam_results')
    .select('email, session_id, score, completed_at');
  if (e1) throw e1;

  const { data: logged, error: e2 } = await db
    .from('migration_log')
    .select('source_key, target_id')
    .eq('source_table', 'exam_results');
  if (e2) throw e2;

  const byKey = new Map((logged || []).map((r) => [r.source_key, r.target_id]));
  let scoreMismatches = 0;
  let identityMisses = 0;
  const named = [];

  for (const r of legacy || []) {
    const sk = `${r.email}|${r.session_id}`;
    const tid = byKey.get(sk);
    if (!tid) {
      identityMisses += 1;
      named.push(`missing sitting for ${sk}`);
      continue;
    }
    const { data: sitting } = await db
      .from('sittings')
      .select('score_pct')
      .eq('id', tid)
      .maybeSingle();
    if (!sitting) {
      identityMisses += 1;
      named.push(`orphan log ${sk} -> ${tid}`);
      continue;
    }
    const expected = Math.round((Number(r.score) / 10) * 100) / 100;
    const got = Number(sitting.score_pct);
    if (Math.abs(expected - got) > 0.05) {
      scoreMismatches += 1;
      named.push(`score mismatch ${sk}: legacy ${expected} vs ${got}`);
    }
  }

  console.log(
    `legacy grade writes: ${legacy?.length ?? 0} | migrated sittings logged: ${logged?.length ?? 0} | ` +
      `score mismatches: ${scoreMismatches} | identity misses: ${identityMisses}`
  );
  if (named.length) {
    for (const line of named.slice(0, 20)) console.log(' -', line);
    console.log('PARITY FAIL');
    process.exit(1);
  }
  console.log('PARITY OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
