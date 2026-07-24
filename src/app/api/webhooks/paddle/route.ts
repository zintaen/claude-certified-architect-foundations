/**
 * Paddle webhook fulfillment (PAY-002).
 * Signature → mapEvent → grantEntitlement (source paddle). Idempotent on event id.
 */
import { NextResponse } from 'next/server';
import { mapEvent, verifyWebhook, type PaddleEvent } from '@/lib/paddle';
import { applyFulfillmentAction } from '@/lib/paddleFulfillment';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  // Explicit write-class (retry-burst budget = SEC-001 write class).
  const routeClass = classify('/api/webhooks/paddle', 'POST');
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

  const signature = request.headers.get('paddle-signature') || '';
  const rawBody = await request.text();

  if (!signature || !verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let evt: PaddleEvent;
  try {
    evt = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!evt?.event_id || !evt?.event_type) {
    return NextResponse.json({ error: 'malformed_event' }, { status: 400 });
  }

  const action = mapEvent(evt);
  if (!action) {
    console.info('[paddle.webhook] ignored_unknown', {
      event_id: evt.event_id,
      event_type: evt.event_type,
    });
    return NextResponse.json({ status: 'ignored-unknown' }, { status: 200 });
  }

  try {
    const result = await applyFulfillmentAction(action);
    console.info('[paddle.webhook] processed', {
      event_id: evt.event_id,
      event_type: evt.event_type,
      result,
      // purchase_fulfilled — server-truth funnel (no raw PII)
      purchase_fulfilled:
        result.status === 'granted' || result.status === 'extended'
          ? {
              sku: 'sku' in action ? action.sku : null,
              tier: action.kind === 'grant' ? action.tier : null,
              exam_code:
                action.kind === 'grant' || action.kind === 'extend' ? action.examCode : null,
              duplicate: Boolean(result.duplicate),
            }
          : null,
    });
    return NextResponse.json({ status: 'processed', result }, { status: 200 });
  } catch (err) {
    console.error('[paddle.webhook] fulfill_error', err);
    // Transient DB errors: 500 so Paddle retries. Unknown mapping already 200.
    return NextResponse.json({ error: 'fulfillment_failed' }, { status: 500 });
  }
}
