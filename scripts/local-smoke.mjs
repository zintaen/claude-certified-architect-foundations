#!/usr/bin/env node
/**
 * One-command PAY-002 local proof (no live Paddle keys).
 *
 * Prerequisites: `npx supabase start`, app on :3000 (`npm run dev` or docker compose),
 * `.env.local` from `.env.example` with PADDLE_DEV_MOCK=1.
 *
 * Usage:
 *   npm run local:smoke
 *   node scripts/local-smoke.mjs --base=http://localhost:3000
 */
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

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

const base = arg('base', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const secret =
  process.env.PADDLE_WEBHOOK_SECRET || arg('secret', 'local_dev_paddle_webhook_secret');
const userId = process.env.PADDLE_DEV_MOCK_USER_ID || '11111111-1111-1111-1111-111111111111';

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function headOk(path) {
  const res = await fetch(`${base}${path}`, { method: 'HEAD', redirect: 'manual' });
  const status = res.status;
  const ok = status >= 200 && status < 400;
  record(`GET ${path}`, ok, `status=${status}`);
  return ok;
}

function sign(body, sec) {
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac('sha256', sec).update(`${ts}:${body}`, 'utf8').digest('hex');
  return `ts=${ts};h1=${h1}`;
}

// 1. Seed mock user
const seed = spawnSync(process.execPath, [join(ROOT, 'scripts/seed-local-dev.mjs')], {
  encoding: 'utf8',
  env: process.env,
});
if (seed.status === 0) {
  record('seed-local-dev', true, (seed.stdout || '').trim().slice(0, 120));
} else {
  record(
    'seed-local-dev',
    false,
    ((seed.stderr || seed.stdout || '').trim() || `exit ${seed.status}`).slice(0, 200)
  );
}

// 2. Page smoke
const pages = ['/', '/pricing', '/terms', '/privacy', '/refunds', '/acceptable-use'];
for (const p of pages) {
  try {
    await headOk(p);
  } catch (err) {
    record(`GET ${p}`, false, err instanceof Error ? err.message : String(err));
  }
}

// 3. Unsigned webhook → 401
try {
  const bad = await fetch(`${base}/api/webhooks/paddle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event_id: 'evt_unsigned',
      event_type: 'transaction.completed',
      data: {},
    }),
  });
  record('webhook unsigned → 401', bad.status === 401, `status=${bad.status}`);
} catch (err) {
  record('webhook unsigned → 401', false, err instanceof Error ? err.message : String(err));
}

// 4. Idempotent signed grant (same event_id ×3)
const eventId = `evt_smoke_idem_${Date.now()}`;
const body = JSON.stringify({
  event_id: eventId,
  event_type: 'transaction.completed',
  occurred_at: new Date().toISOString(),
  data: {
    id: `txn_smoke_${Date.now()}`,
    custom_data: {
      user_id: userId,
      sku: 'per_exam_pass',
      tier: 'tier1',
      exam_code: 'ccaf',
      payment_country: 'US',
    },
    address: { country_code: 'US' },
  },
});
const signature = sign(body, secret);
const replayStatuses = [];
try {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${base}/api/webhooks/paddle`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paddle-signature': signature,
      },
      body,
    });
    const json = await res.json().catch(() => ({}));
    replayStatuses.push({
      http: res.status,
      status: json.status,
      duplicate: Boolean(json?.result?.duplicate),
    });
  }
  const all200 = replayStatuses.every((r) => r.http === 200);
  const firstGrant = replayStatuses[0]?.status === 'processed' && !replayStatuses[0]?.duplicate;
  const laterDup =
    replayStatuses.slice(1).every((r) => r.duplicate === true) ||
    replayStatuses.slice(1).every((r) => r.status === 'processed');
  record(
    'webhook idempotency ×3',
    all200 && firstGrant && laterDup && replayStatuses.filter((r) => r.duplicate).length >= 1,
    JSON.stringify(replayStatuses)
  );
} catch (err) {
  record('webhook idempotency ×3', false, err instanceof Error ? err.message : String(err));
}

// 5. Mock checkout API (when enabled)
try {
  const mockRes = await fetch(`${base}/api/dev/paddle-mock-checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'lifetime', tier: 'tier1' }),
  });
  if (mockRes.status === 404) {
    record(
      'mock checkout API',
      false,
      '404 — enable PADDLE_DEV_MOCK=1 / NEXT_PUBLIC_PADDLE_DEV_MOCK=1'
    );
  } else {
    const json = await mockRes.json().catch(() => ({}));
    record(
      'mock checkout API',
      mockRes.ok && json.status === 'mock_ok',
      `http=${mockRes.status} body=${JSON.stringify(json).slice(0, 160)}`
    );
  }
} catch (err) {
  record('mock checkout API', false, err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      base,
      passed: results.length - failed.length,
      failed: failed.length,
      failures: failed.map((f) => f.name),
    },
    null,
    2
  )
);
process.exit(failed.length === 0 ? 0 : 1);
