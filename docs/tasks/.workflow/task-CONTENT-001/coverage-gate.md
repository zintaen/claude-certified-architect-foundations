---
artefact: coverage-gate@1
task: task-CONTENT-001
phase: testing
tests_failed: 0
files_below_90pct: []
ecm_rows_uncovered: 0
---

# coverage-gate — task-CONTENT-001

## Range

Uncommitted implementing work (no enter-implementing commit); measured on working tree touched TypeScript: `src/core/provenance.types.ts`.

## Report

`docs/tasks/.workflow/task-CONTENT-001/coverage/coverage-summary.json` (vitest + @vitest/coverage-v8)

| file                         | lines.pct |
| ---------------------------- | --------: |
| src/core/provenance.types.ts |    100.00 |

Scripts (`scripts/*.mjs`) are exercised by spawn-based unit tests (exit codes + stderr events); not instrumented by vitest/v8. JSON data / docs are non-executable.

## Suite

`npx vitest run tests/unit/provenance.test.ts` — 10/10 passed; `tests_failed: 0`.

## ECM

All EC-01..EC-12 rows covered by named tests or gate refuse paths.

## Verdict

PASS — per-file coverage on instrumented touched source ≥ 90%; no failing tests.
