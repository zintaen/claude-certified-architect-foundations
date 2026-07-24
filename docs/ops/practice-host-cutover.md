# Practice host cutover (`ccaf` → `practice`)

> **Status (2026-07-25):** Production **stays on `ccaf.cyberskill.world`** until the operator says **`LAUNCH`** (official 1.0.0).  
> Do **not** enable host redirects, flip primary domain, or submit Paddle URLs on `practice` before LAUNCH.  
> Continue implement + test in **local Docker / npm** — see [`local-docker.md`](./local-docker.md).

---

## Until LAUNCH (current)

| Concern                             | Rule                                                              |
| ----------------------------------- | ----------------------------------------------------------------- |
| Live product host                   | `https://ccaf.cyberskill.world`                                   |
| `NEXT_PUBLIC_SITE_URL` (Production) | `https://ccaf.cyberskill.world` (or unset — repo default is ccaf) |
| `HOST_CUTOVER_REDIRECT`             | **`off`** (default). Middleware must not 301 ccaf→practice        |
| Vercel domain redirect              | **Disabled / removed** on `ccaf.cyberskill.world`                 |
| `practice.cyberskill.world`         | Optional staging alias only — do **not** force users there        |
| `ENTITLEMENTS_ENFORCED`             | Keep **`off`**                                                    |
| Paddle keys / live MoR URLs         | Do **not** invent keys; do **not** submit practice URLs yet       |

Repo code: `src/lib/site.ts` defaults to ccaf; middleware redirects only when `HOST_CUTOVER_REDIRECT=on`.

---

## LAUNCH checklist (operator says `LAUNCH`)

Run in order. Do not skip smoke before Paddle.

### 1. Cloudflare DNS (DNS only / grey cloud)

Zone: `cyberskill.world`

1. Ensure `practice` CNAME → same Vercel target as `ccaf` (DNS only, not orange-cloud).
2. Leave apex / www agency records alone.

### 2. Vercel project domains (project `ccaf`)

1. Attach `practice.cyberskill.world` if not already.
2. Set **`practice.cyberskill.world` as primary** production domain.
3. On **`ccaf.cyberskill.world`**, enable **301 redirect** to `practice` (path + query preserved).
4. Confirm TLS on both hosts.

### 3. Environment variables (Vercel Production) + redeploy

| Name                    | Value                               |
| ----------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | `https://practice.cyberskill.world` |
| `HOST_CUTOVER_REDIRECT` | `on`                                |

Do **not** invent Paddle keys. Entitlements enforcement is a separate decision (`ENTITLEMENTS_ENFORCED`).

Redeploy after env change so `NEXT_PUBLIC_*` and middleware see the new values.

### 4. Supabase Auth redirect URLs

- Site URL → `https://practice.cyberskill.world`
- Additional Redirect URLs → add `https://practice.cyberskill.world/**`
- Keep `https://ccaf.cyberskill.world/**` until 301 is proven, then remove

### 5. Smoke

```bash
curl -sI https://practice.cyberskill.world/pricing   # 200
curl -sI https://practice.cyberskill.world/terms     # 200
curl -sI https://ccaf.cyberskill.world/pricing       # 301 → practice …/pricing
```

### 6. Paddle URL list (only after smoke)

- https://practice.cyberskill.world/
- https://practice.cyberskill.world/pricing
- https://practice.cyberskill.world/terms
- https://practice.cyberskill.world/refunds
- https://practice.cyberskill.world/privacy

### 7. Search Console / IndexNow (after cutover)

- Add/verify practice property; submit sitemap.
- Optional: `node scripts/indexnow.mjs` (set host via env / script default at LAUNCH).

---

## Outage note (pre-LAUNCH)

If `ccaf` is already 301ing to `practice` before LAUNCH:

1. **Vercel → Project → Domains:** remove/disable the `ccaf` → `practice` domain redirect immediately.
2. Ensure Production env: `HOST_CUTOVER_REDIRECT=off` (or unset), `NEXT_PUBLIC_SITE_URL=https://ccaf.cyberskill.world`.
3. Redeploy the build that gates middleware behind `HOST_CUTOVER_REDIRECT`.

Code alone cannot undo a Vercel **domain-level** redirect — dashboard change is required.

---

## Blockers checklist (LAUNCH day)

- [ ] Operator said `LAUNCH`
- [ ] Cloudflare `practice` CNAME present (DNS only)
- [ ] Vercel `practice` attached + primary
- [ ] Vercel `ccaf` → `practice` 301 configured
- [ ] `NEXT_PUBLIC_SITE_URL` + `HOST_CUTOVER_REDIRECT=on` set and redeployed
- [ ] Supabase Auth URLs updated
- [ ] Smoke curls green
- [ ] Then Paddle URLs submitted
