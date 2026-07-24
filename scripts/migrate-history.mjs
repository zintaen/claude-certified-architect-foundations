#!/usr/bin/env node
/**
 * DATA-002: backfill sittings from exam_results (dry-run default).
 * Usage: node scripts/migrate-history.mjs [--execute]
 * Does NOT fabricate item_responses from aggregates.
 */
import { createClient } from '@supabase/supabase-js';

const execute = process.argv.includes('--execute');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

function hasPerQuestion(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return false;
  const items = breakdown.items;
  return Array.isArray(items) && items.length > 0 && items.every((i) => i && i.id);
}

async function main() {
  const { data: rows, error } = await db.from('exam_results').select('*');
  if (error) throw error;

  const { data: logged } = await db
    .from('migration_log')
    .select('source_key')
    .eq('source_table', 'exam_results');
  const done = new Set((logged || []).map((r) => r.source_key));

  let wouldSittings = 0;
  let wouldItemRows = 0;
  let skipped = 0;
  let aggregateOnly = 0;

  const { data: exams } = await db.from('exams').select('id, code').eq('code', 'ccaf').limit(1);
  const examId = exams?.[0]?.id ?? null;

  for (const r of rows || []) {
    const sk = `${r.email}|${r.session_id}`;
    if (done.has(sk)) {
      skipped += 1;
      continue;
    }
    wouldSittings += 1;
    if (hasPerQuestion(r.breakdown)) {
      wouldItemRows += r.breakdown.items.length;
    } else {
      aggregateOnly += 1;
    }
    if (!execute) continue;
    if (!examId) throw new Error('exam ccaf not found — seed catalog first');

    const email = String(r.email).trim().toLowerCase();
    const { data: user } = await db.from('users').select('id').eq('email', email).maybeSingle();

    const scorePct = typeof r.score === 'number' ? Math.round((r.score / 10) * 100) / 100 : null;
    const { data: sitting, error: sErr } = await db
      .from('sittings')
      .insert({
        user_id: user?.id ?? null,
        exam_id: examId,
        mode: r.untimed ? 'practice' : 'exam',
        question_set: [],
        submitted_at: r.completed_at,
        score_pct: scorePct,
        passed: r.passed,
        breakdown: r.breakdown,
      })
      .select('id')
      .single();
    if (sErr) throw sErr;

    // Never fabricate item_responses from aggregates.
    if (hasPerQuestion(r.breakdown)) {
      // Only link when item ids are UUIDs present in items — otherwise skip item rows.
      for (const it of r.breakdown.items) {
        const { data: item } = await db
          .from('items')
          .select('id, version')
          .eq('id', it.id)
          .maybeSingle();
        if (!item) continue;
        await db.from('item_responses').insert({
          sitting_id: sitting.id,
          item_id: item.id,
          item_version: item.version ?? 1,
          selected_key: it.chosenLetter ?? it.selected_key ?? null,
          is_correct: Boolean(it.correct ?? it.is_correct),
        });
      }
    }

    await db.from('migration_log').upsert({
      source_table: 'exam_results',
      source_key: sk,
      target_table: 'sittings',
      target_id: sitting.id,
    });
  }

  console.log(
    `exam_results: ${rows?.length ?? 0} rows -> would create ${wouldSittings} sittings ` +
      `(${wouldSittings - aggregateOnly} with per-question data -> ~${wouldItemRows} item_responses); ` +
      `aggregate-only: ${aggregateOnly}; skipped (logged): ${skipped}`
  );
  if (!execute) console.log('DRY RUN - no writes. Pass --execute to apply.');
  else console.log('EXECUTE complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
