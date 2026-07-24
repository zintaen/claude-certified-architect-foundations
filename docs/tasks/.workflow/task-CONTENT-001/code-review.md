# code-review@1 — task-CONTENT-001

## Diff scope

New: types, provenance JSON (80 records), PROVENANCE.md, blueprint snapshot, corpus + manifest, check/similarity/generate scripts, unit tests.
Modified: `package.json` (precommit + test alias).
Untouched: `questions*.ts`, `sampleQuestions.ts` (AC 8).

## §1 clause → test map

| §1                 | AC       | Named proof                                                                               |
| ------------------ | -------- | ----------------------------------------------------------------------------------------- |
| #1 schema          | AC1      | `every bank item has a schema-valid provenance record` + types module                     |
| #2 coverage gate   | AC1, AC2 | `every bank item…`; `seeded missing record…`; `precommit chain includes check-provenance` |
| #3 honesty         | AC3      | `retroactive records omit unknown origin fields`                                          |
| #4 blueprint       | AC4      | `every blueprint_ref resolves into ccaf-blueprint.md`                                     |
| #5 similarity      | AC5      | `all records carry completed similarity_check…`; `similarity script refuses…`             |
| #6 threshold doc   | AC6      | `PROVENANCE.md documents threshold…`                                                      |
| #7 process doc     | AC7      | same PROVENANCE.md section assertions                                                     |
| #8 metadata-only   | AC8      | review: `git diff` empty on questions\*.ts / sampleQuestions.ts                           |
| #9 private records | AC9      | `no src/app import of provenance.ccaf.json`                                               |
| #10 deterministic  | AC10     | `serializer determinism…`                                                                 |

## Edge-case matrix coverage

EC-01..EC-12 addressed by gate failure modes, attestation refuse path, honesty test, grep test, determinism test.

## Reviewer notes

- Sample ids are synthetic (`sample-<domain>-NN`) because sampleQuestions has no id fields (content unchanged).
- Similarity threshold 0.42 set above measured max≈0.24 on corpus-ccaf-v1; zero items flagged this pass.
- `backlog-mutate.mjs` cannot resolve this repo’s flat `docs/tasks/task-*/spec.md` layout; BACKLOG cells were updated carefully by hand to match frontmatter.
- CAF/AWH disabled in `.cyberos/gates.env` → N/A for this task.

## HITL gate 1 — review acceptance

Agent halts here. Does **not** flip to `ready_to_test` without a recorded human verdict.
