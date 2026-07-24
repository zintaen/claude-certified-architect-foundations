# CyberSkill CCAF practice exam

Next.js app. **Production until LAUNCH:** `https://ccaf.cyberskill.world`.

## Local development

Fast path:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Docker + Supabase smoke path (PAY-002 / pricing / legal):

See **[docs/ops/local-docker.md](docs/ops/local-docker.md)**.

```bash
docker compose up --build
# optional: npx supabase start
```

## Host cutover (LAUNCH only)

Do **not** enable `HOST_CUTOVER_REDIRECT` or Vercel `ccaf`→`practice` redirects until the operator says `LAUNCH`. Runbook: [docs/ops/practice-host-cutover.md](docs/ops/practice-host-cutover.md).
