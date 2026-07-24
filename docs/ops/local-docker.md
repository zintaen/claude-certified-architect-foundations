# Local Docker / local smoke (pre-LAUNCH)

Until the operator says **`LAUNCH`**, develop and test on localhost. Production stays on `https://ccaf.cyberskill.world`.

Do **not** set `HOST_CUTOVER_REDIRECT=on` or `ENTITLEMENTS_ENFORCED=on` for local work unless you are explicitly testing those paths.

---

## One command: clean machine → green PAY-002 local proof

```bash
cd /path/to/claude-certified-architect-foundations

# 0. Prerequisites: Node 24 (see .nvmrc), Docker Desktop running

# 1. Env
cp -n .env.example .env.local
# Defaults are fine: cutover off, entitlements off, PADDLE_DEV_MOCK=1.
# For Docker Compose only, also set:
#   NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321

# 2. Supabase (auth / entitlements / catalog)
npx supabase start
npx supabase status          # confirm API URL + keys match .env.local
npx supabase migration up --include-all   # if status shows pending migrations
npm run seed:local-dev       # mock user UUID for webhook grants

# 3. App — pick one (leave running)
npm ci && npm run dev        # http://localhost:3000
# OR: docker compose up --build

# 4. Smoke + PAY-002 local proofs (separate terminal)
npm run local:smoke
# Optional deeper UI:
npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/pricing-checkout.spec.ts
```

`npm run local:smoke` checks legal/pricing pages, unsigned webhook → 401, signed webhook idempotency (replay → `duplicate: true`), and `/api/dev/paddle-mock-checkout`.

Expect **200** on page HEADs (or Next internal 307/308 — not a host cutover to practice).

Stop:

```bash
docker compose down    # if using compose
npx supabase stop      # optional
```

---

## PAY-002 / checkout without real Paddle keys

Honest sandbox purchases need a real Paddle Billing sandbox account — see [`docs/tasks/task-PAY-002-mor-checkout-ppp/BLOCKER.md`](../tasks/task-PAY-002-mor-checkout-ppp/BLOCKER.md). Do **not** invent live keys.

Until then, local mock is enough to exercise webhook signature → fulfillment:

1. Keep `PADDLE_DEV_MOCK=1`, `NEXT_PUBLIC_PADDLE_DEV_MOCK=1`, `PADDLE_USE_FIXTURE_IDS=1`, and `PADDLE_WEBHOOK_SECRET=local_dev_paddle_webhook_secret` in `.env.local`.
2. `npm run seed:local-dev` once (user `11111111-1111-1111-1111-111111111111`).
3. Open `/pricing` → buy a SKU → UI posts a **signed** fixture through `/api/webhooks/paddle`.
4. Or from the CLI:

```bash
npm run paddle:webhook-fixture
npm run paddle:webhook-fixture -- --replay=5 --event-id=evt_idem_demo_01
npm run local:smoke
```

When you have sandbox credentials, set `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID_MAP`, turn **off** `PADDLE_DEV_MOCK` / `NEXT_PUBLIC_PADDLE_DEV_MOCK`, and leave `ENTITLEMENTS_ENFORCED=off` until LAUNCH.

---

## Prerequisites

- Node **24** (see `.nvmrc`)
- Docker Desktop (or equivalent) running
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works)

---

## Env flags (local defaults)

| Name                          | Local value             | Notes                                   |
| ----------------------------- | ----------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000` | Canonical links in HTML                 |
| `HOST_CUTOVER_REDIRECT`       | `off`                   | Never force ccaf→practice locally       |
| `ENTITLEMENTS_ENFORCED`       | `off`                   | Until LAUNCH / operator decision        |
| `PADDLE_DEV_MOCK`             | `1`                     | Local signed-webhook mock checkout      |
| `NEXT_PUBLIC_PADDLE_DEV_MOCK` | `1`                     | Client sees mock checkout as configured |
| `PADDLE_USE_FIXTURE_IDS`      | `1`                     | CI/local fixture `pri_…` ids (not live) |

Production values until LAUNCH: see [`practice-host-cutover.md`](./practice-host-cutover.md).

---

## Tests (optional)

```bash
npm run test -- tests/unit/legal.test.ts tests/unit/site-host.test.ts tests/unit/paddle-webhook.test.ts tests/unit/geo-tier.test.ts
npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/pricing-checkout.spec.ts
npm run local:smoke
```

CI runs unit + Playwright without local Supabase; mock-fulfillment / idempotency e2e **skip** when mock/DB is unavailable. Full PAY-002 local proof is `npm run local:smoke`.

---

## Host cutover

Code paths for `practice.cyberskill.world` remain ready. They are **not** forced until LAUNCH (`HOST_CUTOVER_REDIRECT=on` + Vercel domain primary + DNS). Full runbook: [`practice-host-cutover.md`](./practice-host-cutover.md).
