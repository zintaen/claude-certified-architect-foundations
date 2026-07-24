---
id: task-PAY-002
title: 'Paddle MoR checkout, dual-tier PPP pricing, anti-VPN gating, EU withdrawal compliance'
module: PAY
class: product
priority: MUST
status: ready_to_implement
verify: T
phase: P3
milestone: 'P3 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-16
shipped: null
memory_chain_hash: null
related_tasks: [task-LEGAL-002, task-OBS-001]
depends_on: [task-PAY-001]
blocks: [task-SCALE-003]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Payments - foreign entity + MoR (Paddle, 5% + $0.50 all-in); dual-tier PPP with local-signal corroboration; donations kept; EU withdrawal waiver + button (mandatory since 2026-06-19)'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/paddle.ts
  - src/lib/geoTier.ts
  - src/app/pricing/page.tsx
  - src/app/api/webhooks/paddle/route.ts
  - scripts/reconcile-paddle.mjs
  - docs/monetization-launch.md
  - tests/unit/geo-tier.test.ts
  - tests/unit/paddle-webhook.test.ts
  - tests/e2e/pricing-checkout.spec.ts
modified_files:
  - src/app/refunds/page.tsx
  - src/app/privacy/page.tsx
  - src/lib/analytics.ts
  - next.config.ts
  - package.json
effort_hours: 24
subtasks:
  - 'Paddle adapter + pricing page over SKU/prices registry (6h)'
  - 'Webhook fulfillment: signature, idempotency, grantEntitlement adapter (6h)'
  - 'geoTier multi-signal resolution + anti-VPN plug + corroboration rule (5h)'
  - 'EU consent capture + withdrawal mechanism + policy page updates (4h)'
  - 'Reconciliation script, launch checklist, tests (3h)'
risk_if_skipped: "This is the revenue task: without it the platform monetizes nothing and the doc's entire unit-economics model stays theoretical. Shipping it wrong is worse than late: fulfillment off client callbacks invites theft, tier2 pricing off IP alone invites arbitrage the doc rates High likelihood, and selling to EU consumers without the withdrawal waiver consent and the (already-mandatory) withdrawal button risks fines up to 4% of turnover and a cooling-off window stretched to 12 months."
---

# task-PAY-002 - Paddle MoR checkout, dual-tier PPP pricing, EU compliance

## §1 - Description

1. Paddle Billing MUST be integrated behind a single adapter `src/lib/paddle.ts` (client checkout open + server API/webhook helpers). Paddle products/prices MUST map 1:1 to the PAY-001 SKU registry and the DATA-001 `prices` rows (tier1/tier2 per currency); the mapping is config, verified by a startup/CI consistency check. Sandbox and production environments are env-selected; no card data ever touches the site (Paddle-hosted payment surfaces only).
2. `/pricing` MUST render the doc's SKU architecture with the per-exam pass as the hero, all-access and lifetime as secondary, prices formatted currency-aware from `amount_minor`. Tier2 pricing MUST NOT be displayed as granted by IP alone: the page MAY show provisional regional pricing with corroboration language, but the checkout price is bound by §1 #4.
3. Fulfillment MUST be webhook-only: entitlements are granted exclusively by `/api/webhooks/paddle` processing verified events through PAY-001's `grantEntitlement` (source `paddle`). The client success callback MAY update UI state but MUST NOT grant anything. The webhook handler MUST verify Paddle's signature on every request (unsigned/invalid -> 401, no processing), be idempotent on Paddle event id (replays and retries produce no duplicate grants - checked against `entitlement_events` metadata), map subscription lifecycle events (created/renewed/canceled/past-due) and one-time purchases to grant/expire/revoke, and log-and-200 unknown event types (never 5xx on unknowns, to avoid retry storms).
4. Dual-tier PPP MUST follow the doc's corroboration discipline in `src/lib/geoTier.ts`: (a) IP geolocation yields a provisional tier; (b) tier2 checkout price is granted only when the payment-method country reported by Paddle corroborates a tier2 country; mismatch resolves to tier1 automatically; (c) a pluggable VPN/proxy/Tor detection provider (config; may be off initially) downgrades provisional tier2 to tier1 display when signaling anonymization. Tier country lists are config (tier1 initialized from the doc's list: US/CA/UK/EU/AU/NZ/JP/SG/UAE and peers; the remainder tier2) and operator-editable without code changes.
5. Tier2 discount magnitude MUST be an operator pricing decision entered as `prices` rows (the doc's 50-70% range is guidance for the operator, not a code constant), with config floor/ceiling caps validated by the prices consistency check so a typo cannot publish a 95% discount.
6. EU consumer compliance MUST ship with checkout, not after (the withdrawal-button mandate has been in force since 2026-06-19): (a) EU buyers see, before payment, an express consent checkbox to immediate digital access plus acknowledgment of losing the 14-day withdrawal right - not pre-ticked, blocking checkout until ticked, with the consent text version, timestamp, and locale recorded into `entitlement_events` metadata at fulfillment; (b) a clearly labeled withdrawal/cancellation mechanism (the "withdrawal button" flow) MUST be reachable from the pricing page, the refunds page, and purchase confirmation, routing cancellations/withdrawal requests into Paddle's refund/cancel APIs; (c) consent language MUST be the LEGAL-002-reviewed text (counsel-review gate applies to these strings).
7. Policy surfaces MUST be completed: the `/refunds` page's PAY-002 slots (per-SKU refund terms, EU withdrawal section, Paddle named as Merchant of Record and seller of record) and the `/privacy` sub-processor table row for Paddle. Publishing these updated pages passes through the same counsel-review acceptance as LEGAL-002.
8. Donations MUST remain intact and separate: donate surfaces unchanged, no entitlement semantics, visible alongside pricing (the doc keeps gratitude and access as distinct motivations).
9. `scripts/reconcile-paddle.mjs` MUST compare Paddle transactions/subscriptions against `entitlements`/`entitlement_events` over a window and report discrepancies (missing grants, orphaned grants, expiry drift), dry-run default - the operator's periodic safety net for webhook gaps.
10. The purchase funnel MUST be measurable: `checkout_opened`, `checkout_completed` (client-observed), and server-truth `purchase_fulfilled` (webhook) events extend the OBS-001 typed map, with `exam_code`/`sku`/`tier` properties and no PII beyond the hashed identity rule.
11. The enforcement flip (`ENTITLEMENTS_ENFORCED=on`, PAY-001's dark switch) is this task's launch step and MUST occur only at the task's final human-acceptance gate, after `docs/monetization-launch.md`'s checklist is green: sandbox and production test purchases fulfilled, webhook signature + idempotency verified in production, EU consent recording verified, refund/withdrawal flow exercised, policy pages live, reconciliation clean, rollback documented (flip off + refund path).
12. CSP/security: `next.config.ts` MUST allow Paddle's required script/frame origins explicitly and nothing broader; webhook route MUST be excluded from any auth/consent gates but included in SEC-001's `write` rate-limit class with a budget that accommodates Paddle retry bursts.

## §2 - Why this design

**Why webhook-only fulfillment (§1 #3)?** A client success callback is attacker-controlled input ("I paid, honest"). Paddle's signed webhook is the only trustworthy purchase fact. Idempotency on event id is mandatory because MoRs retry aggressively; without it, every retry is a duplicate grant.

**Why corroborated tier2 instead of IP pricing (§1 #4)?** The doc rates PPP arbitrage High likelihood and prescribes exactly this: "gate the discount on a corroborating local payment signal, not IP alone" (the JetBrains/Netflix discipline). IP sets expectation; the payment instrument's country sets the price. VPN detection is a display-layer assist, pluggable because providers and costs change.

**Why operator-entered discounts with caps (§1 #5)?** The 50-70% figure is the doc's market guidance, and pricing is a business lever the operator will tune; hardcoding it would fossilize a judgment call (and violate the no-invented-targets rule). The floor/ceiling check exists because a fat-fingered price row is otherwise silently live revenue damage.

**Why EU consent recorded at fulfillment (§1 #6)?** The waiver only defends refund disputes if you can produce it per transaction: text version, timestamp, locale, tied to the purchase. Storing it in `entitlement_events` metadata rides the append-only audit trail PAY-001 built - no new mutable store, one dispute-resolution surface.

**Why the flip lives here (§1 #11)?** PAY-001 deliberately shipped the paywall machinery dark. Turning it on is meaningless before checkout exists and reckless before the launch checklist is green; binding the flip to this task's human-acceptance gate makes "start charging" a recorded operator decision with a rollback path, which is what the doc's goodwill-cannibalization risk demands.

## §3 - Contract

```typescript
// src/lib/paddle.ts
export function openCheckout(input: {
  sku: SkuId;
  examCode?: string;
  tier: 'tier1' | 'tier2';
  euConsent?: { textVersion: string; grantedAt: string; locale: string };
}): void; // client
export function verifyWebhook(rawBody: string, signatureHeader: string): boolean; // server
export function mapEvent(evt: PaddleEvent): FulfillmentAction | null; // null = unknown/ignored
// FulfillmentAction -> grantEntitlement / expire / revoke adapter (PAY-001 single write path)

// src/lib/geoTier.ts
export interface TierSignal {
  ipCountry: string | null;
  vpnSuspected: boolean;
}
export function provisionalTier(sig: TierSignal, cfg: TierConfig): 'tier1' | 'tier2';
export function settledTier(
  provisional: 'tier1' | 'tier2',
  paymentCountry: string,
  cfg: TierConfig
): 'tier1' | 'tier2';
// settled rule: tier2 iff provisional tier2 AND paymentCountry in tier2 list; else tier1
export interface TierConfig {
  tier1Countries: string[];
  discountFloorPct: number;
  discountCeilingPct: number;
}
```

```text
POST /api/webhooks/paddle
  401 unsigned/invalid signature (no body processing)
  200 processed | 200 ignored-unknown (logged)
  idempotency: paddle event_id recorded in entitlement_events.metadata; duplicates no-op
Consistency check (CI + startup): every SKU has paddle price ids for every (tier, currency) row;
  every tier2 price within [floor, ceiling] discount of its tier1 sibling.
docs/monetization-launch.md: checklist per §1 #11 + rollback procedure.
```

## §4 - Acceptance criteria

1. **Mapping consistent** - The SKU/price/Paddle-id consistency check passes on the committed config and fails on a seeded gap or an out-of-caps tier2 price (traces_to: §1 #1, #5).
2. **Hero layout** - `/pricing` renders per-exam pass as hero with all-access and lifetime secondary, currency-aware formatting from `amount_minor` (traces_to: §1 #2).
3. **Signature enforced** - Unsigned and tampered webhook fixtures get 401 with zero grants; valid fixtures process (traces_to: §1 #3).
4. **Idempotent fulfillment** - Replaying the same event fixture five times yields exactly one grant and one event row; retries after a mid-handler crash fixture do not duplicate (traces_to: §1 #3).
5. **Lifecycle mapping** - Purchase, renewal, cancellation, and past-due fixtures produce grant/extend/revoke/expire through `grantEntitlement`; unknown event types return 200 and log (traces_to: §1 #3).
6. **Corroboration rule** - Matrix test: (tier2 IP, tier2 card) -> tier2; (tier2 IP, tier1 card) -> tier1; (tier1 IP, tier2 card) -> tier1; VPN-suspected -> tier1 display (traces_to: §1 #4).
7. **Config-driven tiers** - Moving a country between tier lists changes resolution without code changes (fixture config) (traces_to: §1 #4, #5).
8. **EU consent blocks and records** - EU-locale checkout without the consent tick cannot proceed; completed purchase's fulfillment event carries consent text version + timestamp + locale in metadata (traces_to: §1 #6).
9. **Withdrawal mechanism reachable** - The labeled withdrawal/cancel flow is linked from pricing, refunds, and confirmation surfaces and reaches the Paddle cancel/refund adapter in test mode (traces_to: §1 #6).
10. **Policy pages complete** - Refunds page slots populated (per-SKU terms, EU section, MoR named); privacy page gains the Paddle sub-processor row (traces_to: §1 #7).
11. **Donations untouched** - Donate components render and function with pricing live; no entitlement writes from donation paths (traces_to: §1 #8).
12. **Reconciliation works** - Seeded discrepancy fixtures (missing grant, orphaned grant) are reported; clean state reports zero; dry-run default (traces_to: §1 #9).
13. **Funnel events** - checkout_opened / checkout_completed / purchase_fulfilled fire with sku/tier/exam_code and no raw PII (traces_to: §1 #10).
14. **Launch gate + rollback** - `docs/monetization-launch.md` contains the full §1 #11 checklist and rollback procedure; the enforcement flip is documented as the final-acceptance action, not a deploy default (traces_to: §1 #11).
15. **CSP + rate-limit scoped** - CSP allows exactly the Paddle origins required; webhook route classified `write` with retry-burst budget (traces_to: §1 #12).

## §5 - Verification

```typescript
// tests/unit/paddle-webhook.test.ts (vitest)
test('unsigned/tampered -> 401, zero side effects'); // AC 3
test('event replay x5 -> single grant (idempotency on event_id)'); // AC 4
test('lifecycle mapping: purchase/renew/cancel/past-due/unknown'); // AC 5
test('fulfillment metadata carries EU consent when present'); // AC 8

// tests/unit/geo-tier.test.ts
test('corroboration matrix incl. VPN downgrade'); // AC 6
test('tier config swap changes resolution; caps validated'); // AC 7, 1
test('consistency check: missing paddle id and out-of-caps price fail'); // AC 1
```

```typescript
// tests/e2e/pricing-checkout.spec.ts (playwright, Paddle sandbox/mocked)
test('pricing renders hero + secondary SKUs, currency formatting'); // AC 2
test('EU locale: consent unticked blocks checkout; ticked proceeds'); // AC 8
test('withdrawal flow reachable from pricing/refunds/confirmation'); // AC 9
test('refunds + privacy pages carry new sections'); // AC 10
test('donation button functional alongside pricing'); // AC 11
test('funnel events fire with sku/tier/exam_code, no raw PII'); // AC 13
test('reconcile script: seeded discrepancies reported, dry-run default'); // AC 12
test('CSP headers list paddle origins only; webhook in write class'); // AC 15
test('launch doc checklist + rollback sections present'); // AC 14 (fs)
```

## §6 - Implementation skeleton

Paddle sandbox setup -> adapter (checkout open, signature verify, event map) -> webhook route with idempotency over entitlement_events metadata -> geoTier + config -> pricing page over SKU/prices registry -> EU consent component + withdrawal flow -> policy page updates -> reconciliation script -> analytics extension -> CSP + rate-limit wiring -> launch doc -> tests -> (at final acceptance, operator flips enforcement per checklist). Keep `mapEvent` pure and fixture-tested; the route is a thin shell around verify -> map -> grant.

## §7 - Dependencies

- Upstream: task-PAY-001 (SKUs, grantEntitlement, events, dark flag) - hard. task-LEGAL-002's counsel-review gate covers the consent/refund copy (process dependency).
- Downstream: none in this wave (Phase 4/5 tasks build on revenue data).
- External: Paddle account approval (MoR onboarding reviews the site - LEGAL pages must be live), operator-created products/prices in Paddle, the foreign-entity/banking track from the doc (business ops, outside the repo; checkout works against the operator's Paddle account whenever that concludes).

## §8 - Example payloads

```json
// entitlement_events row written by webhook fulfillment (metadata excerpt)
{
  "kind": "granted",
  "source": "paddle",
  "actor": "webhook",
  "metadata": {
    "paddle_event_id": "evt_01h...",
    "transaction_id": "txn_01h...",
    "tier": "tier2",
    "payment_country": "VN",
    "eu_consent": null
  }
}
```

```json
// tier config (excerpt)
{
  "tier1Countries": ["US", "CA", "GB", "DE", "FR", "AU", "NZ", "JP", "SG", "AE"],
  "discountFloorPct": 30,
  "discountCeilingPct": 75
}
```

## §9 - Open questions

Deferred:

- Exact tier2 discount percentages per SKU are operator pricing rows (doc range 50-70% as guidance); the caps in config bound typos, not strategy.
- VPN-detection provider choice (and whether to enable at launch) is an operator config decision; the interface ships, the subscription is bought when abuse data justifies it.
- Local payment rails for emerging markets (VNPay/MoMo/UPI/Pix from the doc) ride Paddle's method coverage initially; direct local-rail integration is a future task if coverage gaps show in funnel data.
- The MoR alternative fallback (Polar/Lemon Squeezy) is not built; the adapter boundary (`paddle.ts`) is where a swap would land if Paddle onboarding fails.

## §10 - Failure modes inventory

| Failure                                        | Detection                                                       | Outcome                          | Recovery                                    |
| ---------------------------------------------- | --------------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| Forged "payment succeeded" from client         | Webhook-only fulfillment (AC 3); client callback grants nothing | Free premium theft attempt fails | Design property                             |
| Webhook replay/retry double-grants             | Idempotency AC 4                                                | Duplicate entitlements           | event_id dedup in events metadata           |
| Webhook outage -> paid users without access    | Reconciliation script AC 12; support grant script (PAY-001)     | Angry customers                  | Reconcile + manual grant; Paddle retries    |
| VPN arbitrage on tier2                         | Corroboration rule AC 6 (payment-country gate)                  | Discount leakage                 | Doc's multi-signal discipline; VPN plug     |
| Legit tier2 buyer with foreign card gets tier1 | Known trade-off of corroboration; support path via manual grant | Individual friction              | Documented in launch doc support section    |
| Fat-fingered price row                         | Caps in consistency check AC 1                                  | Revenue damage                   | CI + startup validation                     |
| EU purchase without recorded waiver            | Consent blocking + metadata recording AC 8                      | 14-day refund exposure + fines   | Blocking checkbox; recorded per transaction |
| Withdrawal button missing (mandate in force)   | AC 9 reachability test                                          | Regulatory exposure              | Ships with checkout, not after              |
| Unknown webhook type 5xxs -> retry storm       | log-and-200 rule AC 5                                           | Webhook queue meltdown           | Closed-world mapping with safe default      |
| Enforcement flipped before checklist green     | §1 #11 binds flip to final human acceptance                     | Paywall without purchase path    | Launch-gate discipline                      |
| CSP too broad (checkout "just works")          | AC 15 explicit origin list                                      | XSS surface growth               | Enumerated origins                          |
| Paddle onboarding rejects site                 | External; LEGAL pages prerequisite noted in §7                  | Launch delay                     | Adapter boundary allows MoR swap (§9)       |
| Funnel events leak email/PII                   | AC 13 payload scan (OBS-001 rule)                               | Privacy breach                   | Hashed-identity rule inherited              |
| Currency formatting error (minor units)        | AC 2 formatting tests across currencies                         | Wrong displayed price            | amount_minor + currency-decimals helper     |

## §11 - Implementation notes

- Paddle signature verification must run on the raw request body before any JSON parse; Next.js route handlers need the unparsed text - read once, verify, then parse.
- Store the Paddle event id inside `entitlement_events.metadata` and enforce dedup with a partial unique index on `(metadata->>'paddle_event_id')` where source = 'paddle' - idempotency at the database, not in handler memory.
- The corroboration trade-off (legit traveler pays tier1) is deliberate and documented; support make-goods use the PAY-001 manual grant script rather than weakening the rule.
- Keep every Paddle-specific type inside `paddle.ts`; `mapEvent`'s output (`FulfillmentAction`) is provider-neutral so the §9 MoR-swap contingency is an adapter, not a rewrite.
- Launch sequencing in the checklist: policy pages -> sandbox purchase -> production test purchase (real card, refunded) -> reconcile clean -> flip enforcement -> monitor funnel + support channel for 48h with rollback (flip off) pre-agreed.

_End of task-PAY-002._
