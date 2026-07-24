#!/usr/bin/env node
/**
 * Idempotent local-dev seed for PAY-002 mock checkout.
 * Ensures the fixed mock user exists (UUID matches .env.example).
 *
 * Usage:
 *   node scripts/seed-local-dev.mjs
 *
 * Requires local Supabase: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (demo keys from `npx supabase status` / .env.example are fine).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnvLocal() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MOCK_USER_ID = process.env.PADDLE_DEV_MOCK_USER_ID || '11111111-1111-1111-1111-111111111111';
const MOCK_EMAIL = process.env.PADDLE_DEV_MOCK_EMAIL || 'local-mock@example.com';

if (!URL || !KEY) {
  console.error(
    JSON.stringify({
      ok: false,
      error: 'Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
    })
  );
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: selErr } = await db
  .from('users')
  .select('id, email')
  .eq('id', MOCK_USER_ID)
  .maybeSingle();

if (selErr) {
  console.error(JSON.stringify({ ok: false, error: selErr.message }));
  process.exit(1);
}

if (existing) {
  console.log(
    JSON.stringify({
      ok: true,
      action: 'exists',
      user_id: existing.id,
      email: existing.email,
    })
  );
  process.exit(0);
}

const { error: insErr } = await db.from('users').insert({
  id: MOCK_USER_ID,
  email: MOCK_EMAIL,
  pin_hash: 'local_dev_not_for_login',
});

if (insErr) {
  // Race / unique email: treat as ok if row now present
  const { data: again } = await db.from('users').select('id').eq('id', MOCK_USER_ID).maybeSingle();
  if (again) {
    console.log(JSON.stringify({ ok: true, action: 'exists_after_race', user_id: MOCK_USER_ID }));
    process.exit(0);
  }
  console.error(JSON.stringify({ ok: false, error: insErr.message }));
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    action: 'inserted',
    user_id: MOCK_USER_ID,
    email: MOCK_EMAIL,
  })
);
