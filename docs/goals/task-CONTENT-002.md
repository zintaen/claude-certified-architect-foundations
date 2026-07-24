---
source: task-CONTENT-002
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-CONTENT-002 item generation pipeline

## predicates

- dry-run default writes manifest + estimate with zero transport calls / DB writes
- allowlist refuses non-blueprint paths; prohibited vendor refuses; skipSimilarity refused
- matrix proportional to blueprint weights; every learning objective covered
- execute+mock transport emits schema-valid ItemProvenance with prompt_ref
- review-auto rejects all-of-the-above, cueing, multi-correct, bloom mismatch; reviser caps
- similarity rejects corpus-matching drafts; gate unskippable
- insert requires approved item_reviews; unsigned refused; approved → item_status beta
- exams.beta_mix_ratio consumed by assembleSitting when body omits betaMix
- explanations pre-generated; no model SDK imports under src/app/\*\*
- calibrate p-value/point-biserial + promotion/degradation (revise, no auto-retire)
- budget abort before submission when estimate > maxUsd
- docs/PIPELINE.md + PROVENANCE.md auto-emission cross-reference present

## notes

Re-verify with local Supabase up + `npm test`. Mock batch transport only in CI.
