#!/usr/bin/env node
/**
 * GROWTH-004 community explanation moderation.
 *
 * Cadence: check queue depth daily (or when community.moderation.queue_depth is elevated).
 * Operator judgment required — never automatically approve.
 *
 * CONTAMINATION SCREEN (human procedure):
 * 1. List pending; script highlights recall-pattern heuristics (actual exam, brain dump, etc.).
 * 2. If submission recalls live-exam content → reject with AUP cite + --contamination
 *    (writes community_item_flags for CONTENT-001 disposition).
 * 3. Otherwise approve with optional note, or reject with note.
 *
 * Usage (dry-run default):
 *   node scripts/moderate-explanations.mjs list
 *   node scripts/moderate-explanations.mjs approve <id> [--note=...] [--execute]
 *   node scripts/moderate-explanations.mjs reject <id> --note=... [--contamination] [--execute]
 */
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const cmd = args[0];
const id = args[1];
const flags = Object.fromEntries(
  args.slice(cmd === 'list' ? 1 : 2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  })
);
const execute = flags.execute === 'true' || flags.execute === '';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const RECALL = [
  /\bon the (actual|real) exam\b/i,
  /\bbrain\s*dump\b/i,
  /\bverbatim (from|of) the exam\b/i,
  /\bi (saw|got|remember) this (exact )?question\b/i,
];

function highlight(body) {
  return RECALL.filter((re) => re.test(body)).map((re) => re.source);
}

async function list() {
  const { data, error } = await db
    .from('community_explanations')
    .select('id, item_id, body, status, created_at, flag_count')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  console.log(`Pending queue depth: ${(data ?? []).length}`);
  console.log(
    'Reminder: if depth stays elevated for >48h, schedule a moderation pass (human only).'
  );
  for (const row of data ?? []) {
    const hits = highlight(row.body || '');
    console.log(
      JSON.stringify({
        id: row.id,
        item_id: row.item_id,
        flag_count: row.flag_count,
        recall_hits: hits,
        body_preview: String(row.body).slice(0, 160),
      })
    );
  }
}

async function approve() {
  if (!id) {
    console.error('approve requires <id>');
    process.exit(1);
  }
  const note = flags.note ? String(flags.note) : null;
  console.log(`Would approve ${id}${note ? ` note=${note}` : ''}`);
  if (!execute) {
    console.log('DRY RUN — pass --execute');
    return;
  }
  const { error } = await db
    .from('community_explanations')
    .update({
      status: 'approved',
      moderation_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  console.log('Approved.');
}

async function reject() {
  if (!id) {
    console.error('reject requires <id>');
    process.exit(1);
  }
  const note = flags.note ? String(flags.note) : '';
  if (!note) {
    console.error('reject requires --note=');
    process.exit(1);
  }
  const contamination = flags.contamination === 'true' || flags.contamination === '';
  console.log(`Would reject ${id} note=${note} contamination=${contamination}`);
  if (!execute) {
    console.log('DRY RUN — pass --execute');
    return;
  }
  const { data: row, error: rErr } = await db
    .from('community_explanations')
    .select('item_id')
    .eq('id', id)
    .single();
  if (rErr) throw rErr;
  const { error } = await db
    .from('community_explanations')
    .update({
      status: 'rejected',
      moderation_note: note.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  if (contamination) {
    const { error: fErr } = await db.from('community_item_flags').insert({
      item_id: row.item_id,
      explanation_id: id,
      reason: note.slice(0, 500),
      aup_cite: 'acceptable-use: content integrity / dumps',
      status: 'open',
    });
    if (fErr) throw fErr;
    console.log('Contamination flag written to community_item_flags (CONTENT-001 disposition).');
  }
  console.log('Rejected.');
}

async function main() {
  if (cmd === 'list') return list();
  if (cmd === 'approve') return approve();
  if (cmd === 'reject') return reject();
  console.error('Usage: list | approve <id> | reject <id> --note=...');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
