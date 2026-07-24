# Monetization launch checklist (PAY-002)

Operator gate before flipping `ENTITLEMENTS_ENFORCED=on`. Keep production Paddle go-live and enforcement dark until every item is green.

## Pre-flight

- [ ] LEGAL pages live: `/terms`, `/privacy`, `/refunds`, `/acceptable-use`
- [ ] Privacy lists Paddle as MoR sub-processor
- [ ] Refunds page: per-SKU terms, EU withdrawal, Paddle named MoR
- [ ] CSP allows only enumerated Paddle origins (`cdn.paddle.com`, `buy.paddle.com` / sandbox, API hosts)
- [ ] Webhook route `/api/webhooks/paddle` classified `write` rate-limit

## Sandbox

- [ ] Paddle UI: first integration / stay in **sandbox**
- [ ] Sandbox products/prices for 4 SKUs (`per_exam_pass`, `all_access_monthly`, `all_access_annual`, `lifetime`) mapped in `PADDLE_PRICE_ID_MAP`
- [ ] Env: `PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- [ ] Webhook destination registered → `/api/webhooks/paddle`
- [ ] Sandbox test purchase → webhook grant once
- [ ] Replay same event → still one grant (idempotent)
- [ ] EU consent checkbox blocks until ticked; fulfillment metadata carries version/timestamp/locale
- [ ] Withdrawal form reaches Paddle cancel/refund adapter (test mode)
- [ ] `node scripts/reconcile-paddle.mjs` clean (or fixture discrepancies understood)

## Production (later operator gate)

- [ ] Live catalog + production keys (separate from sandbox)
- [ ] Production test purchase (real card) fulfilled + refunded
- [ ] Webhook signature + idempotency verified in production
- [ ] Reconciliation clean over a window
- [ ] Policy pages counsel-reviewed

## Enforcement flip (final human acceptance only)

- [ ] All above green
- [ ] Operator sets `ENTITLEMENTS_ENFORCED=on` in production env (not a deploy default)
- [ ] Monitor funnel (`checkout_opened` / `checkout_completed` / `purchase_fulfilled`) + support for 48h

## Rollback

1. Set `ENTITLEMENTS_ENFORCED=off` immediately (paywall dark; existing grants remain in DB but ungated).
2. Pause Paddle price visibility / checkout CTAs if needed.
3. Process refunds via `/pricing/withdrawal` → Paddle dashboard.
4. Run `scripts/reconcile-paddle.mjs` and `scripts/grant-entitlement.mjs` for make-goods.
5. Record the incident in BRAIN / ops notes before re-attempting flip.

## Support note (tier corroboration)

Legitimate travelers whose payment country is tier1 while IP is tier2 pay tier1 by design. Make-goods use `scripts/grant-entitlement.mjs` — do not weaken the corroboration rule.
