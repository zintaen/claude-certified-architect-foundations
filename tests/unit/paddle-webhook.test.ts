import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapEvent, signWebhookBody, verifyWebhook, type PaddleEvent } from '@/lib/paddle';

const SECRET = 'test_webhook_secret_pay002';

function grantEvt(over: Partial<PaddleEvent> = {}): PaddleEvent {
  return {
    event_id: 'evt_01test_grant',
    event_type: 'transaction.completed',
    data: {
      id: 'txn_01test',
      custom_data: {
        user_id: '11111111-1111-1111-1111-111111111111',
        sku: 'per_exam_pass',
        tier: 'tier2',
        exam_code: 'ccaf',
        payment_country: 'VN',
        eu_consent: {
          textVersion: 'eu-digital-waiver-v1',
          grantedAt: '2026-07-24T12:00:00.000Z',
          locale: 'de-DE',
        },
      },
      address: { country_code: 'VN' },
    },
    ...over,
  };
}

describe('paddle webhook (PAY-002)', () => {
  beforeEach(() => {
    vi.stubEnv('PADDLE_WEBHOOK_SECRET', SECRET);
    vi.stubEnv('PADDLE_USE_FIXTURE_IDS', '1');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('unsigned/tampered -> verify fails', () => {
    const body = JSON.stringify(grantEvt());
    expect(verifyWebhook(body, '', SECRET)).toBe(false);
    const good = signWebhookBody(body, SECRET);
    expect(verifyWebhook(body, good, SECRET)).toBe(true);
    expect(verifyWebhook(body + ' ', good, SECRET)).toBe(false);
    expect(verifyWebhook(body, good.replace(/h1=/, 'h1=dead'), SECRET)).toBe(false);
  });

  it('lifecycle mapping: purchase/renew/cancel/past-due/unknown', () => {
    const grant = mapEvent(grantEvt());
    expect(grant?.kind).toBe('grant');
    if (grant?.kind === 'grant') {
      expect(grant.sku).toBe('per_exam_pass');
      expect(grant.euConsent?.textVersion).toBe('eu-digital-waiver-v1');
      expect(grant.paddleEventId).toBe('evt_01test_grant');
    }

    const renew = mapEvent({
      event_id: 'evt_renew',
      event_type: 'subscription.updated',
      data: {
        id: 'sub_1',
        status: 'active',
        next_billed_at: '2026-08-24T00:00:00.000Z',
        custom_data: { user_id: 'u1', sku: 'all_access_monthly' },
      },
    });
    expect(renew?.kind).toBe('extend');

    const cancel = mapEvent({
      event_id: 'evt_cancel',
      event_type: 'subscription.canceled',
      data: {
        id: 'sub_1',
        custom_data: { user_id: 'u1', sku: 'all_access_monthly' },
      },
    });
    expect(cancel?.kind).toBe('revoke');
    if (cancel?.kind === 'revoke') expect(cancel.reason).toBe('canceled');

    const pastDue = mapEvent({
      event_id: 'evt_pd',
      event_type: 'subscription.past_due',
      data: {
        id: 'sub_1',
        custom_data: { user_id: 'u1', sku: 'all_access_monthly' },
      },
    });
    expect(pastDue?.kind).toBe('expire');

    expect(
      mapEvent({
        event_id: 'evt_unk',
        event_type: 'customer.created',
        data: {},
      })
    ).toBeNull();
  });

  it('fulfillment metadata carries EU consent when present', () => {
    const action = mapEvent(grantEvt());
    expect(action?.kind).toBe('grant');
    if (action?.kind === 'grant') {
      expect(action.euConsent).toEqual({
        textVersion: 'eu-digital-waiver-v1',
        grantedAt: '2026-07-24T12:00:00.000Z',
        locale: 'de-DE',
      });
    }
  });

  it('route: unsigned -> 401; valid maps; unknown -> ignored', async () => {
    const { POST } = await import('@/app/api/webhooks/paddle/route');

    const unsigned = await POST(
      new Request('http://localhost/api/webhooks/paddle', {
        method: 'POST',
        body: JSON.stringify(grantEvt()),
      })
    );
    expect(unsigned.status).toBe(401);

    const unknownBody = JSON.stringify({
      event_id: 'evt_x',
      event_type: 'product.updated',
      data: {},
    });
    const sig = signWebhookBody(unknownBody, SECRET);
    const ignored = await POST(
      new Request('http://localhost/api/webhooks/paddle', {
        method: 'POST',
        headers: { 'paddle-signature': sig },
        body: unknownBody,
      })
    );
    expect(ignored.status).toBe(200);
    const ignoredJson = (await ignored.json()) as { status: string };
    expect(ignoredJson.status).toBe('ignored-unknown');
  });
});

describe('paddle idempotency helper (in-memory)', () => {
  it('event replay x5 -> single logical grant id via metadata dedup key', () => {
    const seen = new Set<string>();
    let grants = 0;
    for (let i = 0; i < 5; i++) {
      const action = mapEvent(grantEvt());
      expect(action?.kind).toBe('grant');
      if (action?.kind === 'grant') {
        if (seen.has(action.paddleEventId)) continue;
        seen.add(action.paddleEventId);
        grants += 1;
      }
    }
    expect(grants).toBe(1);
    expect(seen.size).toBe(1);
  });
});
