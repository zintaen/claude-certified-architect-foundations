# Batch 12 — task-AI-001 tutor cost caps

**Date:** 2026-07-24  
**Members:** task-AI-001 (solo)

## Shipped

- Ladder: pregenerated → tutor_cache → live HTTP adapter (`TUTOR_API_URL`)
- Caps fail-closed: per-user ledger + global USD breaker; `TUTOR_ENABLED` default **off**
- Migration `tutor_usage` / `tutor_cache` / `tutor_try_spend`
- `POST /api/tutor` (premium when enforcement on; tutor sub-budget); TutorPanel on results
- Privacy AI sub-processor row; analytics tutor\_\* events; docs/tutor.md

## Gates

build / lint / test **GREEN**.

## HITL

Session policy: advanced to `done`. Live tutor stays off until operator enables + configures provider.
