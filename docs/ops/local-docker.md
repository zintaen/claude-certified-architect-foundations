# Local Docker / local smoke (pre-LAUNCH)

Until the operator says **`LAUNCH`**, develop and test on localhost. Production stays on `https://ccaf.cyberskill.world`.

Do **not** set `HOST_CUTOVER_REDIRECT=on` or `ENTITLEMENTS_ENFORCED=on` for local work unless you are explicitly testing those paths.

---

## Prerequisites

- Node **24** (see `.nvmrc`)
- Docker Desktop (or equivalent) running
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works)

```bash
cd /path/to/claude-certified-architect-foundations
cp .env.example .env.local   # edit secrets as needed
```

---

## Option A — App in Docker (recommended smoke)

Starts Next on **http://localhost:3000** with cutover redirect off.

```bash
docker compose up --build
```

Smoke (another terminal):

```bash
curl -sI http://localhost:3000/pricing | head -5
curl -sI http://localhost:3000/terms | head -5
curl -sI http://localhost:3000/privacy | head -5
curl -sI http://localhost:3000/refunds | head -5
curl -sI http://localhost:3000/acceptable-use | head -5
```

Expect **200** (or 307/308 only if Next internal redirects — not a host cutover to practice).

Stop:

```bash
docker compose down
```

---

## Option B — npm dev (fast iteration)

```bash
npm ci
npm run dev
```

Same smoke curls as above against `http://localhost:3000`.

---

## Supabase (local Docker via CLI)

The app talks to Supabase for auth, entitlements, and scoring. Local stack is managed by the Supabase CLI (it uses Docker under the hood — no extra compose service required).

```bash
npx supabase start
npx supabase status   # copy API URL + anon/service keys into .env.local
```

Typical `.env.local` keys (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply migrations when schema work is needed:

```bash
npx supabase db reset   # local only — destroys local DB data
# or: npx supabase migration up
```

Stop:

```bash
npx supabase stop
```

For PAY-002 / pricing UI without live Paddle: leave Paddle env vars empty; checkout buttons stay inert / sandbox-gated per app logic. Do **not** invent production Paddle keys.

---

## Env flags (local defaults)

| Name                    | Local value             | Notes                             |
| ----------------------- | ----------------------- | --------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | `http://localhost:3000` | Canonical links in HTML           |
| `HOST_CUTOVER_REDIRECT` | `off`                   | Never force ccaf→practice locally |
| `ENTITLEMENTS_ENFORCED` | `off`                   | Until LAUNCH / operator decision  |

Production values until LAUNCH: see [`practice-host-cutover.md`](./practice-host-cutover.md).

---

## PAY-002 / legal / pricing checklist

1. `docker compose up --build` (or `npm run dev`)
2. Open `/pricing`, `/terms`, `/privacy`, `/refunds`, `/acceptable-use`
3. Optional: unit + e2e locally  
   `npm run test -- tests/unit/legal.test.ts tests/unit/site-host.test.ts`  
   `npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/pricing-checkout.spec.ts`
4. Keep Paddle / entitlements off unless testing those flows with sandbox credentials

---

## Host cutover

Code paths for `practice.cyberskill.world` remain ready. They are **not** forced until LAUNCH (`HOST_CUTOVER_REDIRECT=on` + Vercel domain primary + DNS). Full runbook: [`practice-host-cutover.md`](./practice-host-cutover.md).
