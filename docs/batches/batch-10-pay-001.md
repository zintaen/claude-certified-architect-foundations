# Batch 10 — task-PAY-001 entitlements (dark)

**Date:** 2026-07-24  
**Members:** task-PAY-001 (solo; cone overlap)

## Shipped

- `src/lib/skus.ts`, `freePolicy.ts`, `entitlements.ts` (resolve/grant/revoke, dark flag)
- `entitlement_events` migration (append-only)
- Gating hooks in `sittings.ts` + classic grade path; session 402 upgrade payload
- `GET /api/entitlements`, `UpgradePrompt`, `scripts/grant-entitlement.mjs`
- Analytics: upgrade*prompt*\* + entitlement_gate_hit
- `ENTITLEMENTS_ENFORCED` defaults **off**

## Gates

build / lint / test **GREEN** (110 vitest).

## HITL

Session policy: advanced to `done` after machine gates. Enforcement flip remains PAY-002 launch decision.
