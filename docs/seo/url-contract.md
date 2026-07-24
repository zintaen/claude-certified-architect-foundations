# URL contract (SEO-001)

**Freeze date:** 2026-07-24  
**Host (until LAUNCH):** `ccaf.cyberskill.world` is the live product host. `practice.cyberskill.world` is prepared for cutover but **not** forced until operator `LAUNCH` (`HOST_CUTOVER_REDIRECT=on`). Apex `cyberskill.world` remains the agency site — not the product host.  
**Source of truth:** `src/lib/urlContract.ts` (shared with `src/app/sitemap.ts`); origin defaults in `src/lib/site.ts`. Cutover runbook: `docs/ops/practice-host-cutover.md`.

## Rules

1. Every **indexed** path returns HTTP 200 with its title/h1 signature across DATA-002 cutover.
2. Permanent moves use a single 301 in `REDIRECTS` → `next.config.ts` `redirects()` (`permanent: true`). No 302s; max one hop. Host-level `ccaf` → `practice` is LAUNCH-only (Vercel domain + middleware when `HOST_CUTOVER_REDIRECT=on`), not path `REDIRECTS`.
3. CCAF legacy URLs (`/`, `/domains/*`, `/sample-questions/*`, `/guide`, …) remain canonical. **No `/exams/ccaf/*` mirrors.**
4. Runtime paths (`/exam`, `/practice`, `/result`, `/score`, `/flashcards`, `/dashboard`, per-exam practice/exam) are `noindex` and absent from the sitemap.
5. New exams (non-legacy) use `/exams/[code]/…`.

## Indexed paths

See `indexedPaths()` in `src/lib/urlContract.ts` (legal pages, `/pricing`, domains, sample questions, catalog exams excluding CCAF).

## Runtime paths

See `runtimePaths()` — includes `/__seo_contract_404_probe` (deliberate missing page for the 404 counter probe).

## Redirects

`REDIRECTS` is empty at freeze. Add entries only for permanent moves; tests enforce single-hop 301.

## Operator cutover

See `docs/ops/practice-host-cutover.md`.
