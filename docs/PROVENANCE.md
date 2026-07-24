# Provenance — CyberSkill CCAF item bank

This document is the process home for item provenance. Per-item records live in
`src/data/provenance.ccaf.json` and **must not** be published on the public site.
The public trust surface is an aggregate statement (AUP content-integrity from
task-LEGAL-002 plus a short “how our items are made” summary derived from this
doc).

## Schema

Typed contract: `src/core/provenance.types.ts` (`ItemProvenance`).

Per item:

| Field                      | Meaning                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `item_id`                  | Stable id (`Q1`… from the mock bank; `sample-<domain>-NN` for SEO samples)                                              |
| `blueprint_ref`            | Domain + objective from `docs/blueprints/ccaf-blueprint.md`                                                             |
| `origin`                   | How the item was produced. Retroactive bank items use `method: retroactive_attestation` with **unknown fields omitted** |
| `reviewer` / `reviewed_at` | Named human attestation                                                                                                 |
| `similarity_check`         | Completed run against the attested corpus                                                                               |
| `disposition`              | `active` \| `flagged_for_review` \| `retired`                                                                           |
| `record_version`           | Currently `1`                                                                                                           |

Coverage gate: `node scripts/check-provenance.mjs` (wired into `npm run precommit`).

## Attestation procedure (CONTENT-001 retroactive pass)

1. Enumerate every item id in `src/data/questions.public.ts` (via `questions.ts`) and `src/data/sampleQuestions.ts`.
2. Map each item to a primary domain/objective from the blueprint snapshot.
3. Re-examine the item against that objective; record named reviewer + ISO timestamp.
4. For pre-existing items with no generation log: set `origin.method = retroactive_attestation` and **omit** `model`, `prompt_ref`, `generated_at`. Do not invent them.
5. Run `node scripts/similarity-check.mjs --write` (or `node scripts/generate-provenance.mjs`) to fill `similarity_check`.
6. Items over the similarity threshold are set to `disposition: flagged_for_review`. Pull/keep is an **operator** decision recorded on the record — never auto-resolved by the script.
7. Item **content** is not edited in this pass. Unsalvageable items are `retired` in the record; removal is follow-up work.

## Similarity procedure

- **Corpus**: `docs/blueprints/corpus/` — Anthropic public materials only.
- **Attestation gate**: `scripts/similarity-check.mjs` refuses to run unless `manifest.md` contains a line of the form  
  `legitimate_sources_only: attested by <name> <date>`.
- **Method**: `norm-trigram-jaccard` — lowercase/alnum normalize, character trigrams, Jaccard similarity; max score across corpus files.
- **Threshold**: **0.42** (review trigger, not a verdict).
  - Measured on 2026-07-24 against `corpus-ccaf-v1`: bank scores ranged ≈0.01–0.24 (p95 ≈0.24).
  - 0.42 sits above that noise floor with headroom for corpus growth and paraphrase collisions.
  - Crossing the threshold **flags for human review**; a human decides disposition.
- Similarity is a **batch** script, not part of precommit (precommit only checks coverage + schema).

## Blueprint-only sourcing rule

All **future** items must be derived from the exam’s blueprint snapshot under `docs/blueprints/` and the attested corpus. Recalled live-exam questions and dump-site content are forbidden inputs. The blueprint snapshot itself is outline-only (domains, weights, objectives) — never exam questions.

## Forward requirement (task-CONTENT-002)

The item generation pipeline **must** emit a complete `ItemProvenance` record automatically at generation time (`origin.method: blueprint_generation`, with `model`, `prompt_ref`, `generated_at` populated). CONTENT-002 imports the same `ItemProvenance` type — one schema, two writers.

**Auto-emission (shipped):** `tools/item-pipeline/stages/generate.mjs` attaches a full provenance object to every draft. The similarity stage then fills `similarity_check` against the attested corpus. See `docs/PIPELINE.md` for stage semantics and the SME gate before DB insert.

## Sample item ids

`sampleQuestions.ts` has no inline `id` fields (metadata-only rule: content files unchanged). Stable ids are derived by domain enumeration order: `sample-research_pipeline-01` … `sample-code_exploration-05`.
