# Batch 3 — task-CONTENT-002 item generation pipeline

**Date:** 2026-07-24  
**Members:** task-CONTENT-002 (solo; `batch-select` size 1 — all eligible share `service: .`)

## Shipped

- CLI `tools/item-pipeline/pipeline.mjs` (dry-run default, `--execute`, spend cap)
- Stages: spec-matrix, generate (mockable transport), review-auto, similarity, sme-queue, explain, calibrate, insert(beta)
- Migration `20260901000000_item_reviews_and_stats.sql` (`item_ref` without FK; `item_stats` + IRT slots; `exams.beta_mix_ratio`)
- Types `src/core/pipeline.types.ts`; DAL/session consume `beta_mix_ratio`
- Docs: `docs/PIPELINE.md`; PROVENANCE auto-emission note
- Tests: `tests/unit/pipeline-rules.test.ts`, `tests/integration/pipeline.test.ts`

## Gates

build / lint / test **GREEN** (50 tests). Coverage gate SKIP (not configured).

## HITL

Session policy: ritual review/final acceptance skipped; advanced to `done` after machine gates.
