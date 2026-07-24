# Item generation pipeline (CONTENT-002)

Blueprint-driven AI item pipeline with provenance emission, automated review,
similarity gate, mandatory SME sign-off, beta fielding, and classical calibration.

CLI: `node tools/item-pipeline/pipeline.mjs --config <file> [--execute]`

## Stages

| Stage          | Purpose                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `spec-matrix`  | Derive per-domain / objective / cognitive targets from the blueprint           |
| `generate`     | Batch-generate draft items + `ItemProvenance` (`method: blueprint_generation`) |
| `review-auto`  | Item-writing rulebook checks + reviser loop (capped)                           |
| `similarity`   | CONTENT-001 corpus gate (unskippable)                                          |
| `sme-queue`    | Named human verdict (`approved` / `rejected` / `revise`) before any DB write   |
| `insert(beta)` | Insert only `approved` items as `item_status: beta`                            |
| `explain`      | Pre-generate per-option explanations (batch); serving is a DB read             |
| `calibrate`    | Classical stats from `item_responses` → `item_stats`; promotion / revise flags |

Dry-run is the **default**: assemble matrix + cost estimate, write a manifest under
`tools/item-pipeline/runs/`, make **zero** provider calls and **zero** DB writes.
Pass `--execute` to run stages. Production SME sign-off pauses at `pending_sme`
unless reviews are supplied programmatically (tests) or `PIPELINE_SME_AUTO=1`
(test-only auto-approve).

## Config schema

See `tools/item-pipeline/config.example.json`. Required fields:

- `examCode`, `vendor.key`, `vendor.ai_generation_policy` (`permitted` | `prohibited`)
- `blueprintDoc` — must live under `docs/blueprints/` (allowlist)
- `corpusRef` — attested corpus id (similarity gate)
- `targets.totalItems`, `cognitiveMix` (fractions sum to 1)
- `model.generate`, `model.explain`
- `betaMixRatio` — unscored beta items per exam sitting (bounded **0–5**, default **1** for CCAF)
- `maxUsd` — hard spend cap per run
- `maxReviserIterations`
- `promotion.minResponses`, `pValueMin`, `pValueMax`, `pointBiserialMin`

No override flags exist for the vendor AI-policy guard. `skipSimilarity` is refused.

## Blueprint-only input rule

Generation prompts are assembled exclusively from:

1. The allowlisted blueprint document text
2. The built-in item-writing rulebook
3. The derived matrix target (domain / objective / cognitive)

User-submitted free text, recalled questions, and scraped third-party items are
structurally unreachable. Paths outside `docs/blueprints/` are refused at config load.

## SME review procedure

1. Pipeline leaves survivors as `pending_sme` with stable `item_ref` UUIDs.
2. A named reviewer records a verdict row (`item_reviews`: `item_ref`, `reviewer`,
   `verdict`, `notes`, `signed_at`).
3. `item_ref` is **not** an FK to `items` — rejected drafts never enter `items`,
   but the review trail must persist.
4. Insertion requires the **latest** verdict to be `approved`. No sign-off → no insert.
5. Reviewers should strengthen distractors and confirm blueprint fidelity; notes are
   mandatory for `revise` / `rejected`.

## Beta fielding

`exams.beta_mix_ratio` (seeded default **1** for CCAF) is read by
`assembleSitting` when the session body does not override `betaMix`. Beta items
mix unscored into sittings; grading excludes them from `score_pct`.

## Promotion mechanism (classical floor)

`calibrate` computes per item from `item_responses`:

- `response_count`
- `p_value` (proportion correct)
- `point_biserial` (item–total discrimination)

Promotion `beta → scored` requires all of:

| Bound              | Default (pre-fielding placeholder) | Rationale                                             |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| `minResponses`     | 30                                 | Below this, difficulty/discrimination noise dominates |
| `pValue` band      | 0.20–0.85                          | Avoid floor/ceiling items that add little information |
| `pointBiserialMin` | 0.15                               | Weak discrimination signals a flawed key or cueing    |

These numbers are **placeholders until the first fielding cohort is measured**.
After ≥30 responses per beta item in the launch cohort, recompute the observed
p-value and point-biserial distributions and replace the defaults in config + this
table with measured cutoffs (mechanism stays; numbers move).

Scored items whose stats later fall outside bounds receive a `revise` review row
for **human disposition**. Automatic retirement is prohibited.

### IRT deferral

2PL / Rasch fitting activates when the bank has ≥200 scored items **and** median
response count ≥200. Until then, classical stats are the mandatory floor.
`item_stats.irt_a` / `irt_b` columns are already present (nullable) for an additive upgrade.

## Vendor AI-policy guard

If `vendor.ai_generation_policy === 'prohibited'` (CompTIA-class), the pipeline
refuses to start. There is no CLI override. Supporting such vendors requires a
future task that defines a human-authored compliant workflow.

## Cost controls

- Pre-submission estimate from prompt counts (generate + explain)
- Hard abort when estimate > `maxUsd`
- Actual spend appended to the run manifest
- Dry-run default; injectable batch transport (mock in tests / CI)

## Run manifest

Written to `tools/item-pipeline/runs/<runId>.json`:

- `runId`, `startedAt`, `configHash`, exam/vendor/model refs
- `matrix` (domains + targets)
- `stages.*` status + counts
- `spend.estimatedUsd` / `actualUsd`
- `items[]` with outcomes (`inserted_beta` | `rejected_auto` | `rejected_similarity` |
  `rejected_sme` | `pending_sme`)
- Prompt texts retained so provenance `prompt_ref` resolves into the manifest

## Package scripts

```bash
npm run pipeline:dry    # dry-run with example config
npm run pipeline:exec   # execute with mock transport + PIPELINE_SME_AUTO (local only)
```
