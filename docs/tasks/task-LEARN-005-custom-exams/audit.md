---
task_id: task-LEARN-005
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 7/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 9 §1 clauses, 9 ACs, 12 failure modes, 12 named tests. Correctly scoped as a constraint layer over `assembleSitting` rather than a new engine, with the exam-mode isolation matrix (mocks, leaderboard, mastery) fully tested. TRACE families clean. Reciprocity: DATA-001 and PAY-001 `blocks` lists carry task-LEARN-005 (patched upstream).

## §2 - Findings (all resolved)

### ISS-001 - Off-domain padding on under-fill

Draft silently filled short requests from unselected domains, breaking user intent invisibly. Resolved: §1 #3 prohibition with availability dialog; AC 4 zero-padding assertion.

### ISS-002 - Custom sittings hit exam-mode semantics

Draft decremented the free mock allowance and wrote leaderboard rows for custom runs - both wrong (support burden; ranking integrity). Resolved: §1 #4 isolation; AC 5 covers mocks, leaderboard, and mastery exclusion.

### ISS-003 - Mastery-exclusion policy restated normatively

Draft re-decided whether custom responses feed readiness, creating a second normative home that could drift from LEARN-001. Resolved: §1 #4 conforms-not-decides wording, citing LEARN-001 §1 #1; AC 5 tests conformance.

### ISS-004 - Difficulty band promised without calibration

Band filtering on a stats-less exam would be fiction. Resolved: §1 #1 degrade-to-mixed with a visible note; AC 2.

### ISS-005 - Open-ended spec object invited pool probing

An unvalidated constraint object at the API would let clients craft filters as a scraping aid. Resolved: closed constraint model with server-side `validateSpec` (§1 #1, §3); AC 1; failure-mode row 7.

### ISS-006 - Re-run replayed identical items

"Run again" reusing the same item ids builds a memorization loop, not practice. Resolved: §1 #7 constraint-equal, selection-fresh semantics with seeded AC 8.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 ACs 1, 2; #2 AC 3; #3 AC 4; #4 AC 5; #5 AC 6; #6 AC 7; #7 AC 8; #8 AC 9; #9 AC 9).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: presets/pace constants deferred to config anchored on the real exam's pace (§9).
- SAFE: no untrusted content.
- Frontmatter: depends_on [DATA-001, PAY-001] reciprocal (patched); priority SHOULD per plan; effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEARN-005 audit._
