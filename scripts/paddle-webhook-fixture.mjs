#!/usr/bin/env node
/**
 * POST a signed Paddle webhook fixture to local /api/webhooks/paddle.
 *
 * Usage:
 *   node scripts/paddle-webhook-fixture.mjs
 *   node scripts/paddle-webhook-fixture.mjs --url=http://localhost:3000/api/webhooks/paddle
 *   node scripts/paddle-webhook-fixture.mjs --secret=local_dev_paddle_webhook_secret
 *
 * Requires PADDLE_WEBHOOK_SECRET (or --secret). Uses fixture event; does not invent live keys.
 */
import { createHmac } from 'node:crypto';

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const url = arg(
  'url',
  process.env.PADDLE_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/paddle'
);
const secret =
  arg('secret', null) || process.env.PADDLE_WEBHOOK_SECRET || 'local_dev_paddle_webhook_secret';
const userId =
  arg('user', null) ||
  process.env.PADDLE_DEV_MOCK_USER_ID ||
  '11111111-1111-1111-1111-111111111111';
const sku = arg('sku', 'per_exam_pass');
const tier = arg('tier', 'tier1');

const eventId = `evt_fixture_${Date.now()}`;
const body = JSON.stringify({
  event_id: eventId,
  event_type: 'transaction.completed',
  occurred_at: new Date().toISOString(),
  data: {
    id: `txn_fixture_${Date.now()}`,
    custom_data: {
      user_id: userId,
      sku,
      tier,
      exam_code: 'ccaf',
      payment_country: 'US',
    },
    address: { country_code: 'US' },
  },
});

const ts = Math.floor(Date.now() / 1000);
const h1 = createHmac('sha256', secret).update(`${ts}:${body}`, 'utf8').digest('hex');
const signature = `ts=${ts};h1=${h1}`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'paddle-signature': signature,
  },
  body,
});

const text = await res.text();
console.log(JSON.stringify({ status: res.status, event_id: eventId, body: text }, null, 2));
process.exit(res.ok ? 0 : 1);
