---
id: task-CONTENT-001
title: 'Retroactive provenance documentation for the existing CCAF item bank'
module: CONTENT
class: improvement
priority: MUST
status: done
verify: T
phase: P0
milestone: 'P0 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEGAL-002, task-SEC-001]
depends_on: []
blocks: [task-CONTENT-002]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Content sourcing - in-house AI + blueprint + human SME review; provenance logs are the legal shield'
  - 'Risk register: contamination claim - Medium likelihood, High impact'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/core/provenance.types.ts
  - src/data/provenance.ccaf.json
  - docs/PROVENANCE.md
  - docs/blueprints/ccaf-blueprint.md
  - scripts/check-provenance.mjs
  - scripts/similarity-check.mjs
  - tests/unit/provenance.test.ts
modified_files:
  - package.json
effort_hours: 8
subtasks:
  - 'Provenance schema + types + process doc (2h)'
  - 'Blueprint snapshot from the official CCAF exam guide (2h)'
  - 'Retroactive attestation pass over every existing item + records file (2h)'
  - 'Coverage gate script, similarity-check script, tests (2h)'
risk_if_skipped: "The doc names contamination (a 'you copied our exam' claim) as Medium likelihood, High impact, and says the provenance record IS the defense. The current bank ranks on Google for a live Anthropic exam with zero documented provenance; if a claim or C&D arrives before this task ships, there is nothing to show. Every task downstream (the CONTENT-002 pipeline, every new vendor) builds on this schema - retrofitting provenance after the bank multiplies is 10x this cost."
---

# task-CONTENT-001 - Retroactive provenance documentation for the existing CCAF item bank

## §1 - Description

1. The repo MUST gain a typed provenance schema (`src/core/provenance.types.ts`) with, per item: `item_id`, `blueprint_ref` (domain + objective from the official exam guide), `origin` (`method`, and when truthfully known: `model`, `prompt_ref`, `generated_at`), `reviewer`, `reviewed_at`, `similarity_check` (`method`, `corpus_ref`, `max_score`, `verdict`, `checked_at`), `disposition` (`active` | `flagged_for_review` | `retired`), and `record_version`.
2. A provenance record MUST exist for every item id in the current CCAF bank (`src/data/questions.ts` and `src/data/sampleQuestions.ts`), stored in `src/data/provenance.ccaf.json`. A coverage gate `scripts/check-provenance.mjs` MUST fail when any bank item lacks a record or any record points at a nonexistent item, and MUST run in the `precommit` chain.
3. Retroactive honesty is normative: for existing items whose generation details were not logged at creation time, `origin.method` MUST be `retroactive_attestation` and the unknown fields MUST be omitted, not reconstructed. Fabricating prompts, model names, or timestamps for old items is prohibited; the record documents what is known and that a named reviewer re-examined the item at attestation time.
4. Every record's `blueprint_ref` MUST resolve to `docs/blueprints/ccaf-blueprint.md`: a snapshot of the official public CCAF exam guide structure (domain names, weights, objective list) with its source URL and retrieval date. The snapshot MUST contain only blueprint/outline material, never exam questions.
5. `scripts/similarity-check.mjs` MUST compare every bank item against a legitimacy-safe reference corpus - Anthropic's published sample questions and official public study materials only. The corpus MUST NOT ever include dump-site content or user-recalled exam questions; the script MUST read corpus files from `docs/blueprints/corpus/` and refuse to run if that directory's manifest is missing the `legitimate_sources_only` attestation line. Items scoring above the review threshold MUST be set to `disposition: flagged_for_review`; the pull/keep decision on flagged items is an operator call recorded in the record (`disposition` + reviewer + date), never auto-resolved.
6. The similarity method and threshold MUST be documented in `docs/PROVENANCE.md` with the reasoning; the threshold is a review trigger, not a verdict - the doc MUST say a human decides.
7. `docs/PROVENANCE.md` MUST document: the schema, the attestation procedure performed, the similarity procedure, the blueprint-only sourcing rule for all future items, and the forward requirement that task-CONTENT-002's pipeline emits these records automatically at generation time.
8. Item content MUST NOT change in this task - it is metadata-only. Any item the attestation pass judges unsalvageable is `disposition: retired` in the record and its removal becomes ordinary follow-up work, referenced by record.
9. Per-item provenance records MUST NOT be published on the public site; the public trust surface is an aggregate statement (the AUP content-integrity section from task-LEGAL-002 plus a short "how our items are made" summary derived from PROVENANCE.md). Publishing per-item generation detail would hand scrapers a quality map and vendors a fishing surface.
10. The record file MUST be deterministic (stable key order, one item per line or sorted array) so diffs are reviewable and the file merges cleanly.

## §2 - Why this design

**Why records-as-data plus a gate, not a wiki page (§1 #2)?** The defense value of provenance is completeness: a claim answered with "we have records for 96% of items" is a weak defense. A CI gate makes 100% coverage structural - an item cannot enter the bank without a record from this day forward.

**Why forbid reconstruction (§1 #3)?** A provenance log with invented timestamps is worse than none: discovered fabrication in one record poisons the credibility of all records in exactly the scenario (litigation, C&D response) where they are needed. `retroactive_attestation` with a real reviewer and date is honest and still probative: it shows systematic review against the blueprint.

**Why a legitimacy-safe similarity corpus (§1 #5)?** The obvious way to check "do our items resemble the real exam" is to obtain real exam content - which is precisely the NDA violation the whole plan forbids (CompTIA's warning that LLMs may regurgitate braindumps cuts both ways). The check therefore runs only against official public materials, and the corpus manifest attestation makes "someone helpfully added a dump file" a build failure instead of a silent contamination event.

**Why keep per-item provenance private (§1 #9)?** The doc lists provenance transparency as a trust signal, but the signal works at the aggregate level ("every item is blueprint-derived, reviewed, and logged"). Per-item records reveal generation methods and review cadence - competitive information and a roadmap for adversarial mimicry - while adding nothing for learners.

**Why block CONTENT-002 on this (frontmatter blocks)?** The pipeline task generates items at scale; its records must land in a schema that already exists and has survived contact with the real bank. Retrofitting the schema after the generator ships would mean migrating machine-written records - double work.

## §3 - Contract

```typescript
// src/core/provenance.types.ts
export interface BlueprintRef {
  domain: string;
  objective: string;
  blueprint_doc: string; /* repo path */
}
export type OriginMethod = 'blueprint_generation' | 'human_authored' | 'retroactive_attestation';
export interface ItemProvenance {
  item_id: string;
  blueprint_ref: BlueprintRef;
  origin: { method: OriginMethod; model?: string; prompt_ref?: string; generated_at?: string };
  reviewer: string; // named human
  reviewed_at: string; // ISO 8601
  similarity_check: {
    method: string; // e.g. normalized trigram + embedding cosine
    corpus_ref: string; // docs/blueprints/corpus/ manifest id
    max_score: number; // highest similarity found
    verdict: 'clear' | 'over_threshold';
    checked_at: string;
  };
  disposition: 'active' | 'flagged_for_review' | 'retired';
  record_version: 1;
}
```

```text
scripts/check-provenance.mjs   exit 1 on: bank item without record; record without item;
                               record failing schema; non-deterministic file ordering.
scripts/similarity-check.mjs   refuses to run without corpus manifest attestation line
                               'legitimate_sources_only: attested by <name> <date>'.
package.json precommit chain gains check-provenance.
docs/blueprints/ccaf-blueprint.md   domains/weights/objectives + source URL + retrieved date.
```

## §4 - Acceptance criteria

1. **Full coverage** - Every item id in `questions.ts` and `sampleQuestions.ts` has a schema-valid record; the gate proves it and fails on a seeded gap (traces_to: §1 #2).
2. **Gate wired** - `npm run precommit` runs `check-provenance.mjs`; removing a record makes precommit fail (traces_to: §1 #2).
3. **Honest retroactivity** - Every record for a pre-existing item uses `retroactive_attestation` with omitted unknowns; a unit test rejects records that carry `generated_at` without `method: blueprint_generation | human_authored` provenance basis (traces_to: §1 #3).
4. **Blueprint resolves** - Every `blueprint_ref.domain/objective` exists in `ccaf-blueprint.md`; the snapshot carries source URL and retrieval date and contains no question text (traces_to: §1 #4).
5. **Similarity run recorded** - Every record carries a completed `similarity_check`; over-threshold items are `flagged_for_review`; the script refuses to run without the corpus attestation line (traces_to: §1 #5).
6. **Threshold documented as trigger** - PROVENANCE.md states method, threshold, reasoning, and the human-decides rule (traces_to: §1 #6).
7. **Process doc complete** - PROVENANCE.md covers schema, attestation procedure, similarity procedure, blueprint-only rule, and the CONTENT-002 auto-emission requirement (traces_to: §1 #7).
8. **Metadata-only diff** - The task's diff leaves item content byte-identical; only new files plus package.json change (traces_to: §1 #8).
9. **No public per-item exposure** - No page or API serves `provenance.ccaf.json`; a grep test asserts no import of the records file from `src/app/**` (traces_to: §1 #9).
10. **Deterministic file** - Running the record serializer twice yields byte-identical output; records sorted by item_id (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/unit/provenance.test.ts (vitest)
test('every bank item has a schema-valid provenance record'); // AC 1
test('seeded missing record makes check-provenance exit 1'); // AC 1, 2
test('precommit chain includes check-provenance'); // AC 2
test('retroactive records omit unknown origin fields'); // AC 3
test('every blueprint_ref resolves into ccaf-blueprint.md'); // AC 4
test('all records carry completed similarity_check; over-threshold => flagged_for_review'); // AC 5
test('similarity script refuses to run without corpus attestation'); // AC 5
test('no src/app import of provenance.ccaf.json (grep)'); // AC 9
test('serializer determinism: double-run byte-identical, sorted ids'); // AC 10
```

```bash
# AC 6, 7: doc section assertions (fs greps in the same vitest file)
# AC 8: git diff --stat over the task branch shows no change to src/data/questions*.ts content lines
#       (manual verification in review - justified: byte-identity of untouched files is a diff
#        property; the reviewer confirms the diff contains only additions + package.json)
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Order: types -> blueprint snapshot (fetch the official exam guide outline, record URL + date) -> corpus dir with manifest + official sample questions -> similarity script -> attestation pass (walk bank, create records, human reviews each item against its objective) -> records file -> gate script + precommit -> PROVENANCE.md -> tests. The attestation pass is the human-hours core: budget most of the effort there, not in tooling.

## §7 - Dependencies

- Upstream: none. The official CCAF exam guide must be publicly retrievable at attestation time (external, no code coupling).
- Downstream: task-CONTENT-002 MUST emit records in this schema at generation time (blocks edge in frontmatter); task-CONTENT-003 extends blueprint snapshots to the other three Claude exams; task-DATA-001 carries `provenance` as first-class item metadata in the DB model.
- Related: task-LEGAL-002's AUP content-integrity stance is the public face of this private record system.

## §8 - Example payloads

```json
{
  "item_id": "ccaf-q-042",
  "blueprint_ref": {
    "domain": "Agent architecture",
    "objective": "Select context management strategies",
    "blueprint_doc": "docs/blueprints/ccaf-blueprint.md"
  },
  "origin": { "method": "retroactive_attestation" },
  "reviewer": "Stephen Cheng",
  "reviewed_at": "2026-07-20T08:00:00+07:00",
  "similarity_check": {
    "method": "norm-trigram+cosine",
    "corpus_ref": "corpus-ccaf-v1",
    "max_score": 0.31,
    "verdict": "clear",
    "checked_at": "2026-07-20T08:05:00+07:00"
  },
  "disposition": "active",
  "record_version": 1
}
```

## §9 - Open questions

Deferred:

- The similarity threshold value is set during implementation by measuring the score distribution of the bank against the official corpus and placing the trigger above the noise floor; PROVENANCE.md records the chosen value and reasoning (avoids inventing a number here; the rule that it is a human-review trigger is fixed by §1 #6).
- Whether flagged items get pulled immediately or after review is an operator disposition per item (§1 #5); no default is imposed.
- Anthropic exam-guide details should be re-verified against the official guides at attestation time per the source doc's own caveat (third-party-sourced exam facts).

## §10 - Failure modes inventory

| Failure                                            | Detection                                     | Outcome                             | Recovery                                                          |
| -------------------------------------------------- | --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| New item merged without a record                   | Coverage gate in precommit + CI               | Blocked commit                      | Author record; CONTENT-002 automates                              |
| Record invented for an old item (fake timestamps)  | Unit AC 3 rejects shape; review culture       | Poisoned defense credibility        | retroactive_attestation method; honesty rule §1 #3                |
| Dump content added to similarity corpus            | Manifest attestation gate (script refuses)    | Contamination of the checker itself | Corpus dir manifest + review                                      |
| Blueprint snapshot drifts from vendor's live guide | Retrieval date on snapshot; re-verify note §9 | Stale objective mapping             | Re-snapshot on vendor update; version records                     |
| Similarity script false positives flood review     | Threshold set from measured distribution (§9) | Review fatigue                      | Tune trigger; verdicts stay human                                 |
| Similarity misses paraphrase-level collision       | Documented method limitation in PROVENANCE.md | Residual risk                       | Embedding-cosine component; periodic re-runs                      |
| Records file merge conflicts                       | Deterministic sorted serialization (AC 10)    | Painful diffs                       | Stable ordering                                                   |
| Per-item records leak publicly                     | Grep test AC 9                                | Competitive/legal exposure          | Server-only data file, aggregate public statement                 |
| Item content edited during "metadata pass"         | AC 8 diff review                              | Scope creep into content            | Metadata-only rule                                                |
| Reviewer field becomes rubber-stamp                | Named reviewer + date per record; audit trail | Weak human-review claim             | Review procedure in PROVENANCE.md                                 |
| Gate slows precommit                               | Single JSON walk, no network                  | Dev friction                        | Keep O(bank size), no similarity in precommit (batch script only) |
| sampleQuestions.ts forgotten in coverage           | AC 1 enumerates both files                    | Partial coverage                    | Gate walks both modules                                           |

## §11 - Implementation notes

- Similarity checking in precommit would be slow and needs the corpus; run it as an explicit batch script and store results in the records - the gate only checks coverage and schema.
- Write the blueprint snapshot from the official exam guide's public outline in your own words (domain names and weights are facts; the guide's prose is Anthropic's copyright - outline, do not copy).
- The attestation pass is also a quality pass: reviewers will find weak items; resist fixing them inline (§1 #8) - record `flagged_for_review` and queue content work separately so this task stays shippable.
- CONTENT-002 should import `ItemProvenance` from the same types module - one schema, two writers (retroactive tool now, generator later).

_End of task-CONTENT-001._
