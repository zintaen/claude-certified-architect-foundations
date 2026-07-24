/**
 * Local-only PAY-002 mock checkout.
 * Builds a signed Paddle transaction.completed fixture and POSTs /api/webhooks/paddle.
 * Gated: PADDLE_DEV_MOCK / NEXT_PUBLIC_PADDLE_DEV_MOCK must be 1; never on Vercel production.
 */
import { NextResponse } from 'next/server';
import { signWebhookBody, type EuConsent, type PaddleEvent } from '@/lib/paddle';
import { ACTIVE_SKU_IDS, type SkuId } from '@/lib/skus';
import type { PriceTier } from '@/lib/priceCatalog';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const DEFAULT_MOCK_USER = '11111111-1111-1111-1111-111111111111';

function allowDevMock(): boolean {
  const flag =
    process.env.PADDLE_DEV_MOCK === '1' || process.env.NEXT_PUBLIC_PADDLE_DEV_MOCK === '1';
  if (!flag) return false;
  if (process.env.VERCEL_ENV === 'production') return false;
  return true;
}

type Body = {
  sku?: string;
  tier?: string;
  currency?: string;
  examCode?: string | null;
  userId?: string | null;
  euConsent?: EuConsent | null;
};

export async function POST(request: Request) {
  if (!allowDevMock()) {
    return NextResponse.json({ error: 'dev_mock_disabled' }, { status: 404 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const routeClass = classify('/api/dev/paddle-mock-checkout', 'POST') ?? 'write';
  const limited = await enforceRateLimit(routeClass, ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error, retryAfterS: limited.retryAfterS },
      {
        status: limited.status,
        headers: limited.retryAfterS ? { 'Retry-After': String(limited.retryAfterS) } : undefined,
      }
    );
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'PADDLE_WEBHOOK_SECRET required for mock' }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sku = body.sku;
  if (!sku || !(ACTIVE_SKU_IDS as string[]).includes(sku) || sku === 'team_seats') {
    return NextResponse.json({ error: 'invalid_sku' }, { status: 400 });
  }
  const tier = (body.tier === 'tier2' ? 'tier2' : 'tier1') as PriceTier;
  const userId =
    (typeof body.userId === 'string' && body.userId) ||
    process.env.PADDLE_DEV_MOCK_USER_ID ||
    DEFAULT_MOCK_USER;

  const eventId = `evt_local_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const txnId = `txn_local_mock_${Date.now()}`;
  const evt: PaddleEvent = {
    event_id: eventId,
    event_type: 'transaction.completed',
    occurred_at: new Date().toISOString(),
    data: {
      id: txnId,
      custom_data: {
        user_id: userId,
        sku: sku as SkuId,
        tier,
        exam_code: body.examCode ?? 'ccaf',
        payment_country: 'US',
        eu_consent: body.euConsent ?? null,
      },
      address: { country_code: 'US' },
    },
  };

  const rawBody = JSON.stringify(evt);
  const signature = signWebhookBody(rawBody, secret);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const webhookUrl = `${origin.replace(/\/$/, '')}/api/webhooks/paddle`;

  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paddle-signature': signature,
    },
    body: rawBody,
  });

  const webhookJson = await webhookRes.json().catch(() => ({}));
  if (!webhookRes.ok) {
    return NextResponse.json(
      { error: 'webhook_failed', status: webhookRes.status, webhook: webhookJson },
      { status: 502 }
    );
  }

  return NextResponse.json({
    status: 'mock_ok',
    event_id: eventId,
    user_id: userId,
    sku,
    tier,
    webhook: webhookJson,
  });
}
