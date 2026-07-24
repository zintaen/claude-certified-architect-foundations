---
task_id: task-CONTENT-001
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 6/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 9 named unit tests plus one justified manual diff verification. TRACE families clean; all §5 test paths in `new_files`. The spec's load-bearing properties - retroactive honesty, corpus legitimacy gating, and private-by-default records - each trace to the source doc's contamination risk analysis rather than invented policy.

## §2 - Findings (all resolved)

### ISS-001 - Draft fabricated retroactive metadata

First draft "reconstructed" model names and generation dates for old items to make records look complete - exactly the fabrication that would destroy the log's evidentiary value. Resolved: §1 #3 prohibits reconstruction, `retroactive_attestation` method with omitted unknowns, unit test AC 3, §2 rationale.

### ISS-002 - Similarity corpus could itself become the contamination vector

Checking items against "real exam questions" requires possessing them - an NDA violation. Draft was silent on corpus sourcing. Resolved: §1 #5 restricts the corpus to official public materials, adds the manifest attestation the script refuses to run without; failure-mode row 3.

### ISS-003 - Threshold was a magic number

Draft hardcoded a 0.8 similarity threshold with no basis (QA-007 violation). Resolved: §9 defers the value to a measured distribution with the human-review-trigger rule normative (§1 #6); PROVENANCE.md records the choice.

### ISS-004 - Per-item provenance was headed for the public site

Draft exposed records on item pages as a trust signal, handing scrapers a quality map. Resolved: §1 #9 keeps records private with aggregate public messaging; AC 9 grep-gates app imports.

### ISS-005 - Coverage gate missed sampleQuestions.ts

Draft walked only `questions.ts`; the public sample set (the SEO surface most likely to be scrutinized) had no coverage. Resolved: §1 #2 and AC 1 enumerate both modules; failure-mode row 12.

### ISS-006 - Scope creep into content edits

The attestation pass invites inline "quick fixes" to weak items, mixing a metadata task with content changes that have no review trail. Resolved: §1 #8 metadata-only rule with `retired`/`flagged_for_review` dispositions; AC 8; §11 note.

### ISS-007 - No determinism requirement on the records file

Unordered JSON would produce unreviewable diffs and merge conflicts across the exact file whose diff-review discipline matters most. Resolved: §1 #10, AC 10 double-run byte-identity test.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (#1 via schema use across ACs 1/3/5; #2 by ACs 1, 2; #3 by AC 3; #4 by AC 4; #5 by AC 5; #6 by AC 6; #7 by AC 7; #8 by AC 8; #9 by AC 9; #10 by AC 10).
- TRACE-002: AC 8's manual verification is a diff property with inline justification (permitted form). TRACE-003: all §5 paths in `new_files`.
- QA-004/007: no invented numeric targets survive (ISS-003).
- SAFE: no untrusted-content blocks required; corpus attestation is the injection-adjacent control.
- Frontmatter: enum-valid; `blocks: [task-CONTENT-002]` reciprocal with CONTENT-002's `depends_on` (verified at CONTENT-002 authoring); effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-CONTENT-001 audit._

## §10 - Post-implementation closure (ship-tasks)

- coverage-gate@1: PASS (`src/core/provenance.types.ts` 100% lines; suite 10/10)
- TRACE-004: PASS (all §5 named tests passed)
- awh-gate: N/A (no sealed goldenset)
- caf-gate: N/A (`CAF_ENABLED=false`); reduced floor GREEN via `run-gates.sh`
- HITL: review acceptance APPROVED; final acceptance APPROVED in advance (session policy)
- Status: `testing → done` 2026-07-24
