---
task_id: task-PAY-002
blocker: paddle_vendor_credentials
updated: 2026-07-25
status_note: Implementation landed (adapter, pricing, webhook, reconcile, CSP). Local mock (PADDLE_DEV_MOCK) + npm run local:smoke proves signed webhook→grant + idempotency without inventing live keys. Sandbox keys still missing for honest Paddle UI / MoR review proof. ENTITLEMENTS_ENFORCED stays off.
---

# PAY-002 credential blocker

Honest integration requires real Paddle Billing credentials (sandbox first, then production). Do **not** invent keys.

## Local without sandbox keys (done)

See [`docs/ops/local-docker.md`](../../ops/local-docker.md):

```bash
npx supabase start && npm run seed:local-dev
npm run dev   # or docker compose up --build
npm run local:smoke
```

That path posts **signed** fixtures through `/api/webhooks/paddle` (CLI + `/pricing` mock checkout). It is **not** a substitute for sandbox purchase proof at final acceptance.

## Repo status (2026-07-25)

- Code for PAY-002 is in-tree (env-driven; fixture Paddle price IDs only for CI / local mock).
- `.env.local` may enable `PADDLE_DEV_MOCK` with a local webhook secret — never commit real keys.
- Operator UI reminder: choose **“No, this is my first integration”** and stay in **sandbox**.

## Exact asks for the operator (after Paddle review)

1. **Paddle sandbox account** with Billing enabled (first integration path)
2. Create **4 products/prices** mapped to SKUs in `src/lib/skus.ts`:
   - `per_exam_pass`, `all_access_monthly`, `all_access_annual`, `lifetime`
   - Skip `team_seats`
3. Set in `.env.local` (and later Vercel preview/prod):
   - `PADDLE_ENV=sandbox`
   - `PADDLE_API_KEY=`
   - `PADDLE_WEBHOOK_SECRET=`
   - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=`
   - `PADDLE_PRICE_ID_MAP=` JSON map of `sku → tier → currency → pri_…`
   - Turn **off** `PADDLE_DEV_MOCK` / `NEXT_PUBLIC_PADDLE_DEV_MOCK` when using real sandbox
4. Register webhook destination → `/api/webhooks/paddle` (tunnel or preview URL)
5. Domains allowlist: `localhost` + live host Paddle can reach (`ccaf.cyberskill.world` until LAUNCH)
6. Run one sandbox purchase → confirm single grant; replay event → still one grant
7. For production cutover later only: live keys + catalog (separate gate). **Do not** flip `ENTITLEMENTS_ENFORCED=on` until `docs/monetization-launch.md` is green.

## Related

- **SCALE-003** remains blocked until PAY-002 lands with honest sandbox proof.
- Checklist: [`docs/monetization-launch.md`](../../monetization-launch.md)
