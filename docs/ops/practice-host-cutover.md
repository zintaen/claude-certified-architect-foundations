# Practice host cutover (`ccaf` → `practice`)

**Goal:** Make `practice.cyberskill.world` the primary product host for Paddle MoR verification and SEO canonicals. Keep apex `cyberskill.world` as the agency site (do **not** point product traffic there).

**Deploy performed by agent:** NO (operator must authorize deploy).

**Repo defaults after this change:** `NEXT_PUBLIC_SITE_URL` / `SITE_URL` → `https://practice.cyberskill.world` (see `src/lib/site.ts`). Middleware 301s `ccaf.cyberskill.world` → `practice.cyberskill.world` (path + query preserved) as belt-and-suspenders; prefer Vercel domain redirect so TLS stays simple with Cloudflare DNS-only.

---

## Paddle URL list (paste after DNS + Vercel + deploy are live)

Do **not** submit these to Paddle while they 404.

- https://practice.cyberskill.world/
- https://practice.cyberskill.world/pricing
- https://practice.cyberskill.world/terms
- https://practice.cyberskill.world/refunds
- https://practice.cyberskill.world/privacy

---

## 1. Cloudflare DNS (DNS only / grey cloud)

Zone: `cyberskill.world`

1. Open **DNS** → **Records**.
2. Note the existing `ccaf` CNAME target (today typically something like `9370073ab879bcc4.vercel-dns-017.com` — use whatever Vercel shows when you add the domain).
3. **Add record:**
   - Type: `CNAME`
   - Name: `practice`
   - Target: **same Vercel DNS target as `ccaf`** (or the target Vercel displays after step 2)
   - Proxy status: **DNS only** (grey cloud) — not orange-cloud
   - TTL: Auto
4. Leave `ccaf` CNAME as-is until Vercel redirect is configured and verified.
5. Do **not** change apex `cyberskill.world` / `www` agency records for this cutover.

---

## 2. Vercel project domains (project `ccaf`)

Project: **ccaf** (`prj_8e1QXA1PlZOQ8AWRzKUbbUvbXnJf`, team CyberSkill).

1. **Project → Settings → Domains**.
2. **Add** `practice.cyberskill.world`.
   - Complete any DNS verification if Vercel prompts (should match the CNAME you added).
   - Set **`practice.cyberskill.world` as the primary production domain** when offered.
3. On **`ccaf.cyberskill.world`**, configure a **301 redirect** to `practice.cyberskill.world`:
   - Prefer Vercel’s domain redirect UI (“Redirect to another domain”).
   - Preserve path and query (`/pricing?x=1` → `https://practice.cyberskill.world/pricing?x=1`).
4. Confirm both hostnames show valid certificates (DNS-only + Vercel TLS).

Vercel MCP/CLI in this environment cannot attach custom domain redirects — use the dashboard clicks above.

---

## 3. Environment variables (Vercel Production)

| Name                   | Value                               |
| ---------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://practice.cyberskill.world` |

Do **not** invent Paddle keys. Do **not** flip `ENTITLEMENTS_ENFORCED=on`.

Redeploy after env change so client bundles pick up `NEXT_PUBLIC_*`.

---

## 4. Supabase Auth redirect URLs

In Supabase project → **Authentication → URL configuration**:

- Site URL: `https://practice.cyberskill.world`
- Additional Redirect URLs: add  
  `https://practice.cyberskill.world/**`  
  (keep legacy `https://ccaf.cyberskill.world/**` temporarily until redirect is proven, then remove)

---

## 5. Deploy (operator only)

1. Merge / promote the commit that contains `src/lib/site.ts` + legal/pricing surfaces.
2. Production deploy on project `ccaf` (same project; new primary domain).
3. Smoke:
   - `curl -sI https://practice.cyberskill.world/pricing` → 200
   - `curl -sI https://practice.cyberskill.world/terms` → 200
   - `curl -sI https://ccaf.cyberskill.world/pricing` → **301** Location `https://practice.cyberskill.world/pricing`
4. Only then paste the five Paddle URLs.

---

## 6. Google Search Console (after cutover)

1. Add property `https://practice.cyberskill.world` (or domain property `cyberskill.world` if not already).
2. Submit `https://practice.cyberskill.world/sitemap.xml`.
3. Optionally use Change of Address / monitor `ccaf` 301 coverage; expect temporary dual-indexing until Google consolidates.

---

## 7. IndexNow (optional)

After deploy: `node scripts/indexnow.mjs` (host default is now `practice.cyberskill.world`).

---

## Blockers checklist

- [ ] Cloudflare `practice` CNAME not added yet
- [ ] Vercel domain `practice.cyberskill.world` not attached / not primary
- [ ] Vercel `ccaf` → `practice` 301 not configured
- [ ] `NEXT_PUBLIC_SITE_URL` not set + redeployed
- [ ] Production still serving an old build without `/pricing` `/terms` `/privacy` `/refunds`
- [ ] Paddle submission before smoke checks (will fail review on 404s)
