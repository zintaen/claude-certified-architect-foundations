# Batch 8 — task-SEC-001 anti-scraping baseline

**Date:** 2026-07-24  
**Members:** task-SEC-001 (solo; cone overlap)

## Shipped

- `src/lib/rateLimit.ts`, `src/middleware.ts`, `src/lib/turnstile.ts`
- `src/data/canary.server.ts` + practice mix / grade exclusion
- subscribe Turnstile + route limiter; robots `/api/`; next.config X-Robots-Tag
- `docs/abuse-response.md`; unit + e2e tests

## Gates

build / lint / test **GREEN** (92 vitest). Playwright rate-limits 4/4.

## HITL

Session policy: advanced to `done` after machine gates.
