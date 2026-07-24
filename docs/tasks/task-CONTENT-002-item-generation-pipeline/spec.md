---
id: task-CONTENT-002
title: 'Blueprint-driven AI item pipeline with provenance, similarity gate, SME sign-off, beta fielding'
module: CONTENT
class: product
priority: MUST
status: done
verify: T
phase: P2
milestone: 'P2 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001, task-DATA-002]
depends_on: [task-DATA-001, task-CONTENT-001]
blocks: [task-CONTENT-003, task-LEARN-002, task-AI-001]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D pipeline steps 1-7: blueprint-derived specs, multi-agent generation, item-writing best practices, SME sign-off, beta fielding, psychometric calibration, lifecycle'
  - '§F AI cost: frontier models offline in batch for generation and pre-generated explanations; near-zero marginal serving cost'
  - 'CompTIA explicitly prohibits AI-generated study materials - vendor-policy guard required'
language: typescript 5 (node cli) + postgres (supabase)
service: .
new_files:
  - tools/item-pipeline/pipeline.mjs
  - tools/item-pipeline/config.example.json
  - tools/item-pipeline/stages/spec-matrix.mjs
  - tools/item-pipeline/stages/generate.mjs
  - tools/item-pipeline/stages/review-auto.mjs
  - tools/item-pipeline/stages/similarity.mjs
  - tools/item-pipeline/stages/sme-queue.mjs
  - tools/item-pipeline/stages/explain.mjs
  - tools/item-pipeline/stages/calibrate.mjs
  - src/core/pipeline.types.ts
  - supabase/migrations/20260901000000_item_reviews_and_stats.sql
  - docs/PIPELINE.md
  - tests/unit/pipeline-rules.test.ts
  - tests/integration/pipeline.test.ts
modified_files:
  - docs/PROVENANCE.md
  - package.json
effort_hours: 32
subtasks:
  - 'Spec-matrix + config + run-manifest plumbing (5h)'
  - 'Batch generation stage with provenance emission (6h)'
  - 'Automated review stages (item-writing rules, linguistic/bias, distractor quality) + reviser loop (8h)'
  - 'Similarity gate reuse + SME queue + DB insertion as beta (5h)'
  - 'Explanation pre-generation + calibration job + promotion logic (6h)'
  - 'Docs + tests (2h)'
risk_if_skipped: 'Without a repeatable pipeline the catalog grows by hand at hand speed, and every hand-written batch lacks the provenance, review trail, and calibration data that the doc calls the defensible moat. Worse: ad-hoc LLM generation without the blueprint-only input gate, similarity gate, and SME sign-off is exactly the contamination pathway CompTIA warns about - the pipeline IS the legal and quality control.'
---

# task-CONTENT-002 - Blueprint-driven AI item pipeline

## §1 - Description

1. The repo MUST gain an item-generation pipeline CLI (`tools/item-pipeline/pipeline.mjs`) with discrete, resumable stages: `spec-matrix` -> `generate` -> `review-auto` -> `similarity` -> `sme-queue` -> `insert(beta)` -> `explain` and, on live response data, `calibrate`. Each run operates on one exam config and writes a run manifest (inputs hash, model ids, parameters, per-stage outcomes, spend) so any item's creation is fully reconstructable.
2. Input legitimacy is enforced structurally: a run's config MUST reference only (a) the exam's blueprint snapshot (`docs/blueprints/*`, per task-CONTENT-001) and (b) the attested similarity corpus. The pipeline MUST refuse to start if the config references any other content source, and generation prompts MUST be assembled exclusively from blueprint text plus the item-writing rulebook - user-submitted text, recalled questions, or scraped third-party items MUST NOT be reachable by the prompt assembler (allowlist, not denylist).
3. `spec-matrix` MUST derive generation targets from the blueprint: item counts per domain proportional to official domain weights, objective coverage (every objective receives at least one item target), and a cognitive-level mix (recall / application / analysis) recorded per target. The matrix is written to the run manifest before any generation.
4. `generate` MUST call the model provider's batch API (50% cost tier) with prompt caching enabled, using a frontier model configured per run. Every generated item MUST be emitted with a complete `ItemProvenance` record (task-CONTENT-001 schema: `method: blueprint_generation`, model, prompt_ref into the run manifest, generated_at) - the pipeline is the second writer of the same schema.
5. `review-auto` MUST run the item-writing rulebook as machine checks, each producing pass/fail findings per item: single clear stem; exactly one defensibly correct option; plausible-distractor heuristics; no cueing (stem does not leak the answer; options of comparable length/grammar); no "all of the above"/"none of the above"; Bloom-level tag matches the target from the matrix; linguistic/bias pass (reading level, culturally loaded content flags). Items with failures route to a reviser loop (regenerate with findings attached) capped at a configured max iterations; items still failing are rejected with findings recorded.
6. `similarity` MUST run every surviving item through the task-CONTENT-001 similarity gate (same script, same attested corpus). Over-threshold items are rejected and logged; the gate cannot be skipped by config.
7. `sme-queue` MUST require a named human sign-off per item before insertion: the migration adds `item_reviews` (`item_id`, `reviewer`, `verdict` `approved`|`rejected`|`revise`, `notes`, `signed_at`). The pipeline inserts items into `items` (task-DATA-001) with `item_status: beta` ONLY for items whose latest review verdict is `approved`. No sign-off, no insertion - the human step is non-negotiable per the doc.
8. Beta fielding rides task-DATA-001's assembly: inserted beta items mix unscored into sittings; `item_responses` accumulate. This task MUST set the beta-mix ratio config (per exam) that DATA-001's assembly consumes, with its default documented in `docs/PIPELINE.md`.
9. `explain` MUST pre-generate, via the batch API, per-option explanations ("why this is correct / why each distractor is wrong") for every approved item, stored in `items.explanations`. Runtime serving of explanations MUST be a database read - no live model call is added to any request path by this task.
10. `calibrate` MUST compute per item, from accumulated `item_responses`: response count, p-value (difficulty), and point-biserial discrimination, persisted to a new `item_stats` table with computed_at. Promotion `beta -> scored` MUST require minimum response count and stat bounds from config (values chosen at implementation from the first fielding cohort's distribution, documented with rationale in PIPELINE.md - the mechanism is normative, the numbers are measured, not invented here). Scored items whose stats degrade below the bounds MUST be flagged `revise` in `item_reviews` for human disposition; automatic retirement is prohibited.
11. IRT (2PL/Rasch) fitting is deferred behind a data-volume trigger recorded in PIPELINE.md; classical statistics (p-value, point-biserial) are the mandatory calibration floor now. The `item_stats` schema MUST leave room (nullable columns) for IRT parameters so the upgrade is additive.
12. Vendor AI-policy guard: vendor config MUST carry `ai_generation_policy: permitted | prohibited`. The pipeline MUST refuse to run for a `prohibited` vendor (CompTIA-class) - no override flag exists in this task; supporting such vendors requires a future task defining a compliant (human-authored) workflow.
13. Cost control: every run MUST enforce a configured spend cap (estimated from token counts before submission; hard-abort when the batch estimate exceeds cap), default to dry-run (assemble prompts, print counts and cost estimate, write nothing), and append actual spend to the run manifest. Explanations and generation MUST both flow through the same budget accounting.
14. `docs/PIPELINE.md` MUST document: stage semantics, config schema, the blueprint-only rule, SME review procedure, promotion mechanism and where its numbers come from, the vendor-policy guard, cost controls, and the run-manifest format. `docs/PROVENANCE.md` gains the auto-emission cross-reference it promised (task-CONTENT-001 §1 #7).

## §2 - Why this design

**Why allowlist inputs instead of prohibiting bad ones (§1 #2)?** The contamination threat model includes well-meaning contributors pasting "a question I remember" into a config. A denylist cannot enumerate all bad sources; an allowlist of two paths (blueprint, attested corpus) makes contamination a structural impossibility rather than a policy, and it is what the provenance records then truthfully attest.

**Why machine checks for item-writing rules (§1 #5)?** The doc cites research (AI-GENIE, LM-AIG, Duolingo's DET pipeline) that AI generation reaches human-comparable psychometric quality only when paired with review. Encoding the rulebook as deterministic checks makes quality repeatable and cheap at the exact place volume happens, and reserves human attention (SME stage) for judgment, not mechanical defects.

**Why SME sign-off before insertion, not after (§1 #7)?** Once an item is servable it can be seen, screenshotted, and cached. Sign-off after fielding would mean unreviewed AI content reached learners - the reputational and legal exposure the doc's positioning ("original, reviewed, not dumps") cannot afford. The DB constraint (insert requires approved review row) turns policy into referential integrity.

**Why measured promotion thresholds (§1 #10)?** Psychometric cutoffs (acceptable p-value bands, minimum point-biserial) depend on the item pool and audience; textbook constants pasted into a spec would be QA-007 fabrication. The mechanism (min responses + bounds + human disposition for degradation) is what the spec can honestly fix.

**Why no runtime LLM calls (§1 #9)?** The doc's unit-economics design pre-generates all expensive AI work at build time so serving cost is near zero and the free tier stays affordable. The tutor (live, capped, cheap-model) is a different, future product surface - this pipeline must not smuggle marginal cost into request paths.

**Why a hard vendor guard with no override (§1 #12)?** CompTIA's prohibition is explicit and the doc's own benchmark says "sequence those vendors last with heavier human review". An override flag would get used under deadline pressure; making compliant support a separate task forces the deliberate workflow design the risk deserves.

## §3 - Contract

```typescript
// src/core/pipeline.types.ts (shape; full types in implementation)
export interface PipelineConfig {
  examCode: string;
  vendor: { key: string; ai_generation_policy: 'permitted' | 'prohibited' };
  blueprintDoc: string; // docs/blueprints/<exam>.md (allowlisted root)
  corpusRef: string; // attested corpus id (similarity gate)
  targets: { totalItems: number }; // matrix derives per-domain counts from weights
  cognitiveMix: { recall: number; application: number; analysis: number }; // fractions, sum=1
  model: { generate: string; explain: string }; // frontier model ids, batch mode
  reviser: { maxIterations: number };
  betaMixRatio: number; // unscored items per sitting, consumed by DATA-001 assembly
  promotion: { minResponses: number; pValue: [number, number]; pointBiserialMin: number };
  budget: { maxUsd: number }; // hard cap per run
}

export interface RunManifest {
  runId: string;
  startedAt: string;
  config: PipelineConfig;
  configHash: string;
  stages: Record<string, { status: 'ok' | 'failed' | 'skipped'; counts: Record<string, number> }>;
  spend: { estimatedUsd: number; actualUsd: number };
  items: {
    itemId: string;
    outcome:
      | 'inserted_beta'
      | 'rejected_auto'
      | 'rejected_similarity'
      | 'rejected_sme'
      | 'pending_sme';
  }[];
}
```

```sql
-- 20260901000000_item_reviews_and_stats.sql (shape)
create table item_reviews (id uuid primary key default gen_random_uuid(),
  item_ref uuid not null, reviewer text not null,
  verdict text not null check (verdict in ('approved','rejected','revise')),
  notes text, signed_at timestamptz not null default now());
create table item_stats (item_id uuid not null references items, computed_at timestamptz not null,
  response_count int not null, p_value numeric(5,4), point_biserial numeric(5,4),
  irt_a numeric, irt_b numeric,          -- nullable IRT slots (§1 #11)
  primary key (item_id, computed_at));
-- RLS on, no anon policies (repo pattern)
```

```text
CLI: node tools/item-pipeline/pipeline.mjs --config <file> [--stage <name>] [--execute]
  dry-run default: prints matrix, prompt counts, cost estimate; writes nothing
  --execute: runs stages, appends run manifest under tools/item-pipeline/runs/<runId>.json
  refuses when: vendor policy prohibited; config references non-allowlisted sources;
                corpus attestation missing; budget estimate > maxUsd
```

## §4 - Acceptance criteria

1. **Stages + manifest** - A full dry run over a fixture blueprint produces a run manifest with matrix, per-stage plans, and cost estimate; `--execute` with mocked model transport completes all stages and records outcomes per item (traces_to: §1 #1).
2. **Allowlist holds** - A config referencing a file outside the blueprint/corpus allowlist is refused at startup; prompt-assembler unit test proves prompts contain only blueprint + rulebook text (fixture with poisoned extra file never reaches the prompt) (traces_to: §1 #2).
3. **Matrix matches weights** - For a fixture blueprint with known weights, per-domain targets are proportional, every objective gets at least one target, and cognitive mix follows config (traces_to: §1 #3).
4. **Provenance complete** - Every generated item in the execute run carries a schema-valid `ItemProvenance` with model, prompt_ref resolving into the run manifest, and generated_at (traces_to: §1 #4).
5. **Rulebook enforced** - Unit fixtures: an all-of-the-above item, a cueing item (answer longest option), a two-correct-options item, and a wrong-Bloom item each fail their named check; reviser loop caps at maxIterations then rejects with findings (traces_to: §1 #5).
6. **Similarity gate unskippable** - An item fixture matching corpus text is rejected; no config combination skips the stage (config-schema test) (traces_to: §1 #6).
7. **No sign-off, no insertion** - Items without an `approved` review row are not inserted; approved items insert as `item_status: beta`; the integration test attempts insertion of a pending item and asserts refusal (traces_to: §1 #7).
8. **Beta ratio flows to assembly** - The exam's betaMixRatio lands where DATA-001's assembly reads it; assembly test (extended) shows the configured unscored count (traces_to: §1 #8).
9. **Explanations pre-generated, statically served** - Approved items gain per-option explanations in `items.explanations` via batch stage; grep/import test proves no request path added by this task calls a model SDK (traces_to: §1 #9).
10. **Calibration + promotion mechanics** - With synthetic response fixtures: stats computed correctly (hand-checked p-value and point-biserial values), promotion fires only above minResponses and within bounds, degraded scored item gets a `revise` review row and is never auto-retired (traces_to: §1 #10, #11).
11. **Vendor guard absolute** - A `prohibited` vendor config refuses to run; no flag in the CLI schema overrides it (traces_to: §1 #12).
12. **Budget hard cap + dry-run default** - Estimate above maxUsd aborts before submission; missing `--execute` writes nothing (integration asserts zero DB rows and zero transport calls) (traces_to: §1 #13).
13. **Docs complete** - PIPELINE.md covers the §1 #14 list; PROVENANCE.md cross-reference added (traces_to: §1 #14).

## §5 - Verification

```typescript
// tests/unit/pipeline-rules.test.ts (vitest)
test('all-of-the-above rejected'); // AC 5
test('cueing heuristics: length/grammar leak detected'); // AC 5
test('single-correct-option check'); // AC 5
test('bloom mismatch flagged against matrix target'); // AC 5
test('reviser cap -> rejected_auto with findings'); // AC 5
test('prompt assembler: allowlist only (poisoned fixture excluded)'); // AC 2
test('matrix proportionality + objective coverage + cognitive mix'); // AC 3
test('p-value and point-biserial hand-checked fixtures'); // AC 10
test('promotion gate: minResponses + bounds; degradation -> revise row, no auto-retire'); // AC 10
```

```typescript
// tests/integration/pipeline.test.ts (local supabase + mocked batch transport)
test('dry-run default: manifest + estimate, zero writes/calls'); // AC 1, 12
test('execute run: provenance completeness, prompt_ref resolution'); // AC 4
test('unsigned items refused; approved insert as beta'); // AC 7
test('similarity stage rejects corpus-matching fixture; unskippable via config schema'); // AC 6
test('explanations stored; no model SDK import in src/app/** (grep)'); // AC 9
test('betaMixRatio consumed by assembly (DATA-001 test extension)'); // AC 8
test('prohibited vendor refused; CLI schema has no override'); // AC 11
test('budget abort before submission when estimate > cap'); // AC 12
test('PIPELINE.md + PROVENANCE.md sections present'); // AC 13
```

## §6 - Implementation skeleton

Types + config schema -> run-manifest plumbing -> spec-matrix -> prompt assembler (allowlist) + batch transport with injectable mock -> review-auto rulebook checks -> similarity stage (invoke CONTENT-001 script) -> item_reviews migration + sme-queue (CLI lists pending, records verdicts) -> insertion path (verdict-gated) -> explain stage -> calibrate stage + item_stats -> docs -> tests. The SME queue UI is CLI-first (list/approve/reject with notes); a web review surface is future work.

## §7 - Dependencies

- Upstream: task-DATA-001 (items/sittings/item_responses schema, assembly beta hook) - hard; task-CONTENT-001 (provenance schema, similarity script, attested corpus, blueprint snapshots) - hard.
- Downstream: task-CONTENT-003 runs this pipeline for the four Claude exams (blocks edge); the future AI-tutor and premium-explanation surfaces consume `items.explanations`.
- External: Anthropic batch API access + budget (operator provisions keys/limits); SME reviewer time (named humans).

## §8 - Example payloads

```json
// run manifest excerpt
{
  "runId": "run-2026-09-03-ccdv",
  "configHash": "9be1...",
  "stages": {
    "generate": { "status": "ok", "counts": { "requested": 120, "returned": 118 } },
    "review-auto": { "status": "ok", "counts": { "pass": 96, "revised": 14, "rejected_auto": 8 } },
    "similarity": { "status": "ok", "counts": { "clear": 95, "rejected_similarity": 1 } }
  },
  "spend": { "estimatedUsd": 41.2, "actualUsd": 38.77 },
  "items": [{ "itemId": "f3ab...", "outcome": "pending_sme" }]
}
```

```json
// item_reviews row
{
  "item_ref": "f3ab...",
  "reviewer": "Stephen Cheng",
  "verdict": "approved",
  "notes": "Distractor B strengthened; scenario realistic.",
  "signed_at": "2026-09-04T10:12:00+07:00"
}
```

## §9 - Open questions

Deferred:

- Promotion threshold values (minResponses, p-value band, point-biserial floor) are set from the first fielding cohort's measured distribution and recorded with rationale in PIPELINE.md (§1 #10) - mechanism normative here, numbers measured there.
- IRT fitting activates at the data-volume trigger documented in PIPELINE.md (§1 #11); the stats table already carries the columns.
- Whether SME review gets a web UI (vs CLI queue) is a future ergonomics task once reviewer count exceeds one.
- Model choice per run (which frontier model generates, which explains) is config, revisited as pricing moves; the doc's batch+caching strategy is the fixed part.

## §10 - Failure modes inventory

| Failure                                             | Detection                                                                     | Outcome                              | Recovery                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Recalled/dump text reaches a prompt                 | Allowlist refusal + prompt-assembler test (AC 2)                              | Contamination - the existential risk | Structural allowlist; no free-text config inputs      |
| Model returns near-copy of official sample question | Similarity gate (AC 6)                                                        | NDA-adjacent collision               | Rejected + logged; corpus per CONTENT-001             |
| Unreviewed AI item reaches learners                 | Verdict-gated insertion (AC 7)                                                | Reputational/legal exposure          | Referential-integrity gate, not policy                |
| Reviser loops forever on a bad seed                 | maxIterations cap (AC 5)                                                      | Token burn                           | Cap + rejected_auto with findings                     |
| Batch job partially returns                         | Run manifest per-stage counts; resumable stages (§1 #1)                       | Missing items                        | Re-run stage; manifest dedups                         |
| Budget overrun on a big run                         | Pre-submission estimate abort (AC 12)                                         | Surprise bill                        | Hard cap; batch pricing assumed only after estimate   |
| Explanations drift from item after revision         | Explanations regenerated on version bump (explain stage keys on item version) | Stale rationale                      | Version-keyed explain runs                            |
| Promotion on tiny samples                           | minResponses gate (AC 10)                                                     | Noise-calibrated exam                | Config floor; measured thresholds                     |
| Auto-retire removes a good item on a stats blip     | Prohibited; revise row + human disposition (AC 10)                            | Silent bank shrinkage                | Human-in-loop degradation path                        |
| Vendor guard bypassed under deadline                | No override exists (AC 11)                                                    | CompTIA-class violation              | Separate compliant-workflow task required             |
| Beta ratio set absurdly high                        | Config bound + PIPELINE.md guidance; assembly test                            | Learner experience degraded          | Bounded config value                                  |
| Two pipelines write conflicting provenance shapes   | Single schema import from CONTENT-001 types                                   | Split provenance                     | Shared type module                                    |
| Stats computed over canary/retired responses        | Calibrate filters by item_status; unit fixture                                | Skewed stats                         | Status filter in query                                |
| SME rubber-stamps under volume                      | Review rows carry notes + named reviewer; audit trail visible                 | Quality theater                      | Reviewer procedure in PIPELINE.md; sampling re-review |

## §11 - Implementation notes

- Inject the batch transport (interface with `submit/poll/fetch`) so integration tests run on a mock and the real transport is one adapter; never hit the live API in CI.
- Cueing heuristics that work in practice: correct option is longest in >60% of a batch; grammatical agreement between stem and only one option; option sets with one odd formatting. Encode each as an independent check with its own fixture.
- The prompt assembler should emit the exact prompt text into the run directory (referenced by `prompt_ref`) - provenance that cannot show the prompt is half a defense.
- Keep stage outputs as JSONL in the run directory before DB insertion; the DB gets only signed items, the run directory keeps everything for audit.
- `item_reviews.item_ref` is uuid without FK to `items` deliberately: rejected items never enter `items`, but their review trail must persist. Document this in the migration comment.

_End of task-CONTENT-002._
