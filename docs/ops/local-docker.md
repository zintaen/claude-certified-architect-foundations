# Local Docker / local smoke (pre-LAUNCH)

Until the operator says **`LAUNCH`**, develop and test on localhost. Production stays on `https://ccaf.cyberskill.world`.

Do **not** set `HOST_CUTOVER_REDIRECT=on` or `ENTITLEMENTS_ENFORCED=on` for local work unless you are explicitly testing those paths.

---

## Happy path (clean machine → green local)

```bash
cd /path/to/claude-certified-architect-foundations

# 1. Env
cp .env.example .env.local
# Defaults are fine for local: cutover off, entitlements off, PADDLE_DEV_MOCK=1.
# For Docker Compose, set Supabase URL to the host gateway:
#   NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321

# 2. Supabase (auth / entitlements / catalog)
npx supabase start
npx supabase status          # confirm API URL + keys match .env.local
npx supabase migration up --include-all   # if status shows pending migrations

# Optional: seed the local mock checkout user (UUID matches .env.example)
# docker exec supabase_db_<project> psql -U postgres -d postgres -c \
#   "INSERT INTO public.users (id, email, pin_hash) VALUES
#    ('11111111-1111-1111-1111-111111111111','local-mock@example.com','x')
#    ON CONFLICT (id) DO NOTHING;"

# 3. App — pick one
docker compose up --build          # http://localhost:3000
# OR
npm ci && npm run dev

# 4. Smoke
curl -sI http://localhost:3000/ | head -5
curl -sI http://localhost:3000/pricing | head -5
curl -sI http://localhost:3000/terms | head -5
curl -sI http://localhost:3000/privacy | head -5
curl -sI http://localhost:3000/refunds | head -5
curl -sI http://localhost:3000/acceptable-use | head -5
```

Expect **200** (or Next internal 307/308 — not a host cutover to practice).

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
2. Open `/pricing` → buy a SKU → UI posts a **signed** fixture through `/api/webhooks/paddle` (grants for the mock user).
3. Or from the CLI:

```bash
node scripts/paddle-webhook-fixture.mjs
# optional: --url= --secret= --user= --sku= --tier=
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
npm run test -- tests/unit/legal.test.ts tests/unit/site-host.test.ts tests/unit/paddle-webhook.test.ts
npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/pricing-checkout.spec.ts
```

---

## Host cutover

Code paths for `practice.cyberskill.world` remain ready. They are **not** forced until LAUNCH (`HOST_CUTOVER_REDIRECT=on` + Vercel domain primary + DNS). Full runbook: [`practice-host-cutover.md`](./practice-host-cutover.md).
