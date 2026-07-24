#!/usr/bin/env node
/**
 * DATA-002: backfill users from legacy identities (dry-run default).
 * Usage: node scripts/migrate-users.mjs [--execute]
 * Only talks to SUPABASE_URL / service role — no third-party egress.
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

function sourceKey(email, pinHash) {
  return `${email.toLowerCase()}|${pinHash}`;
}

async function main() {
  const { data: results, error: e1 } = await db.from('exam_results').select('email, pin_hash');
  if (e1) throw e1;

  const identities = new Map();
  for (const r of results || []) {
    if (!r.email || !r.pin_hash) continue;
    const email = String(r.email).trim().toLowerCase();
    const pin = String(r.pin_hash);
    const k = sourceKey(email, pin);
    if (!identities.has(k)) identities.set(k, { email, pin_hash: pin });
  }

  const { data: logged } = await db
    .from('migration_log')
    .select('source_key')
    .eq('source_table', 'exam_results_identity');
  const done = new Set((logged || []).map((r) => r.source_key));

  let would = 0;
  let skipped = 0;
  for (const [k, id] of identities) {
    if (done.has(k)) {
      skipped += 1;
      continue;
    }
    would += 1;
    if (!execute) continue;
    const { data: user, error } = await db
      .from('users')
      .upsert({ email: id.email, pin_hash: id.pin_hash }, { onConflict: 'email' })
      .select('id')
      .single();
    if (error) throw error;
    await db.from('migration_log').upsert({
      source_table: 'exam_results_identity',
      source_key: k,
      target_table: 'users',
      target_id: user.id,
    });
  }

  console.log(
    `identities: ${identities.size} unique; would create/link ${would}; skipped (logged): ${skipped}`
  );
  if (!execute) {
    console.log('DRY RUN - no writes. Pass --execute to apply.');
  } else {
    console.log('EXECUTE complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
