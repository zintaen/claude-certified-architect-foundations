---
source: task-CONTENT-001
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-CONTENT-001 provenance coverage

## predicates

Runnable cited tests (re-verify with `npm test -- tests/unit/provenance.test.ts`):

- every bank item has a schema-valid provenance record
- seeded missing record makes check-provenance exit 1
- precommit chain includes check-provenance
- retroactive records omit unknown origin fields
- every blueprint_ref resolves into ccaf-blueprint.md
- all records carry completed similarity_check; over-threshold => flagged_for_review
- similarity script refuses to run without corpus attestation
- no src/app import of provenance.ccaf.json (grep)
- serializer determinism: double-run byte-identical, sorted ids
- PROVENANCE.md documents threshold as human-decides trigger and process sections

## not_mechanically_re_verifiable

- AC 8 metadata-only diff property (justified manual / git diff review)

## notes

Detection only via `node .cyberos/docs-tools/verify-goals.mjs`. Violations do not auto-reopen the task.
