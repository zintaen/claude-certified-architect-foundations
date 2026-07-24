#!/usr/bin/env node
/**
 * Manual entitlement grant/revoke (PAY-001).
 * Dry-run by default; pass --execute to write.
 *
 * Usage:
 *   node scripts/grant-entitlement.mjs --email=a@b.com --sku=lifetime --actor=ops
 *   node scripts/grant-entitlement.mjs --email=a@b.com --sku=per_exam_pass --exam=ccaf --execute
 *   node scripts/grant-entitlement.mjs --revoke=<entitlement_uuid> --email=a@b.com --actor=ops --execute
 */
import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  })
);

const execute = args.execute === 'true' || args.execute === '';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const actor = String(args.actor || 'operator');
const email = String(args.email || '')
  .trim()
  .toLowerCase();

async function main() {
  if (!email) {
    console.error('Required: --email=');
    process.exit(1);
  }

  const { data: user, error: uErr } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!user) {
    console.error(`No users row for ${email}. Migrate identity first (DATA-002).`);
    process.exit(1);
  }

  if (args.revoke) {
    const id = String(args.revoke);
    console.log(`Would revoke entitlement ${id} for ${email} (actor=${actor})`);
    if (!execute) {
      console.log('DRY RUN - no writes. Pass --execute to apply.');
      return;
    }
    const { data: row, error } = await db
      .from('entitlements')
      .select('id, sku, exam_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error) throw error;
    const { error: upErr } = await db
      .from('entitlements')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (upErr) throw upErr;
    const { error: evErr } = await db.from('entitlement_events').insert({
      user_id: user.id,
      sku: row.sku,
      exam_id: row.exam_id,
      kind: 'revoked',
      source: 'manual',
      actor,
      metadata: { entitlement_id: id },
    });
    if (evErr) throw evErr;
    console.log('Revoked + event appended.');
    return;
  }

  const sku = String(args.sku || '');
  if (!sku) {
    console.error('Required: --sku= or --revoke=');
    process.exit(1);
  }

  let examId = null;
  if (args.exam) {
    const { data: exam, error } = await db
      .from('exams')
      .select('id')
      .eq('code', String(args.exam))
      .maybeSingle();
    if (error) throw error;
    if (!exam) {
      console.error(`Exam not found: ${args.exam}`);
      process.exit(1);
    }
    examId = exam.id;
  }

  console.log(
    `Would grant sku=${sku} exam_id=${examId} user=${user.id} source=manual actor=${actor}`
  );
  if (!execute) {
    console.log('DRY RUN - no writes. Pass --execute to apply.');
    return;
  }

  const startsAt = new Date().toISOString();
  const { data: ent, error } = await db
    .from('entitlements')
    .insert({
      user_id: user.id,
      sku,
      exam_id: examId,
      status: 'active',
      source: 'manual',
      starts_at: startsAt,
      ends_at: args.endsAt ? String(args.endsAt) : null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: evErr } = await db.from('entitlement_events').insert({
    user_id: user.id,
    sku,
    exam_id: examId,
    kind: 'granted',
    source: 'manual',
    actor,
    metadata: { entitlement_id: ent.id },
  });
  if (evErr) throw evErr;
  console.log(`Granted entitlement ${ent.id}; event appended.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
