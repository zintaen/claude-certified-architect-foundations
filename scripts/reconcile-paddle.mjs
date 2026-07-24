#!/usr/bin/env node
/**
 * Reconcile Paddle transactions/subscriptions vs entitlements (PAY-002).
 * Dry-run by default — reports discrepancies; pass --execute only when wiring auto-fix (future).
 *
 * Usage:
 *   node scripts/reconcile-paddle.mjs
 *   node scripts/reconcile-paddle.mjs --window-days=7 --fixture=tests/fixtures/paddle-reconcile.json
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  })
);

const execute = args.execute === 'true' || args.execute === '';
const windowDays = Number(args['window-days'] || 14);
const fixturePath = args.fixture ? String(args.fixture) : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paddleKey = process.env.PADDLE_API_KEY;
const paddleEnv = (process.env.PADDLE_ENV || 'sandbox').toLowerCase();
const apiBase =
  paddleEnv === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

/** @typedef {{ transaction_id: string, user_id: string, sku: string, status: string }} PaddleTxn */
/** @typedef {{ kind: string, transaction_id?: string, entitlement_id?: string, detail: string }} Drift */

function report(drifts) {
  if (drifts.length === 0) {
    console.log('OK: zero discrepancies');
    return 0;
  }
  console.log(`Found ${drifts.length} discrepancy(ies):`);
  for (const d of drifts) {
    console.log(`- [${d.kind}] ${d.detail}`);
  }
  return drifts.length;
}

async function fetchPaddleTransactions(sinceIso) {
  if (fixturePath) {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    return /** @type {PaddleTxn[]} */ (raw.transactions || []);
  }
  if (!paddleKey) {
    console.error(
      'No PADDLE_API_KEY and no --fixture=… — cannot pull live Paddle data. Dry-run needs one.'
    );
    process.exit(2);
  }
  const res = await fetch(
    `${apiBase}/transactions?status=completed&created_at[gte]=${encodeURIComponent(sinceIso)}`,
    { headers: { Authorization: `Bearer ${paddleKey}` } }
  );
  if (!res.ok) {
    console.error('Paddle API error', res.status, await res.text());
    process.exit(2);
  }
  const json = await res.json();
  const data = json.data || [];
  return data.map((t) => ({
    transaction_id: t.id,
    user_id: t.custom_data?.user_id || '',
    sku: t.custom_data?.sku || '',
    status: t.status,
  }));
}

async function main() {
  if (execute) {
    console.log('NOTE: --execute is reserved; this script remains report-only (dry-run).');
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);
  const sinceIso = since.toISOString();

  /** @type {Drift[]} */
  const drifts = [];

  const paddleTxns = await fetchPaddleTransactions(sinceIso);

  if (!url || !key) {
    // Fixture-only mode: compare against seeded expected grants in the fixture file
    if (fixturePath) {
      const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
      const grants = raw.entitlement_grants || [];
      const grantTxnIds = new Set(grants.map((g) => g.transaction_id));
      for (const t of paddleTxns) {
        if (!grantTxnIds.has(t.transaction_id)) {
          drifts.push({
            kind: 'missing_grant',
            transaction_id: t.transaction_id,
            detail: `Paddle txn ${t.transaction_id} has no matching entitlement grant`,
          });
        }
      }
      for (const g of grants) {
        if (!paddleTxns.some((t) => t.transaction_id === g.transaction_id) && g.expect_orphan) {
          drifts.push({
            kind: 'orphaned_grant',
            entitlement_id: g.entitlement_id,
            detail: `Entitlement ${g.entitlement_id} has no matching Paddle txn`,
          });
        }
      }
      process.exit(report(drifts) === 0 ? 0 : 1);
    }
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or --fixture)');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: events, error } = await db
    .from('entitlement_events')
    .select('id, user_id, sku, kind, source, metadata, created_at')
    .eq('source', 'paddle')
    .gte('created_at', sinceIso);
  if (error) throw error;

  const grantedTxnIds = new Set();
  for (const ev of events || []) {
    const meta = ev.metadata || {};
    if (ev.kind === 'granted' && meta.transaction_id) {
      grantedTxnIds.add(String(meta.transaction_id));
    }
  }

  for (const t of paddleTxns) {
    if (t.status === 'completed' && t.transaction_id && !grantedTxnIds.has(t.transaction_id)) {
      drifts.push({
        kind: 'missing_grant',
        transaction_id: t.transaction_id,
        detail: `completed Paddle txn ${t.transaction_id} missing entitlement grant`,
      });
    }
  }

  for (const ev of events || []) {
    const meta = ev.metadata || {};
    if (ev.kind === 'granted' && meta.transaction_id) {
      const tid = String(meta.transaction_id);
      if (!paddleTxns.some((t) => t.transaction_id === tid) && paddleKey) {
        drifts.push({
          kind: 'orphaned_grant',
          entitlement_id: meta.entitlement_id,
          detail: `grant event ${ev.id} txn ${tid} not in Paddle window pull`,
        });
      }
    }
  }

  const code = report(drifts);
  process.exit(code === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
