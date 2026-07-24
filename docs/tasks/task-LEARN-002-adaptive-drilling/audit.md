---
task_id: task-LEARN-002
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 6/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 13 named tests. The adaptive policy is a pure, seed-deterministic function with the difficulty term isolated behind a swap seam for the deferred IRT upgrade, and all serving invariants are inherited from `assembleSitting` rather than reimplemented. TRACE families clean. Reciprocity: CONTENT-002's `blocks` gained task-LEARN-002 (patched); LEARN-001's blocks already carried it.

## §2 - Findings (all resolved)

### ISS-001 - Pure weakness-targeting demoralizes

Draft selected hardest items from weakest domains - a churn generator masquerading as rigor. Resolved: §1 #1 difficulty-proximity term (drill at the edge of ability); AC 1; §2 rationale.

### ISS-002 - Calibrated-only filter starved young exams

Requiring item_stats would make drilling unavailable exactly where the catalog is newest, and would concentrate exposure on the calibrated subset. Resolved: §1 #2 neutral-difficulty fallback with mixed-pool AC 2.

### ISS-003 - Second assembly path

Draft built its own item-serving query, forking answer-key shaping, canary exclusion, and response capture. Resolved: §1 #3 routes through assembleSitting with a persisted variant; AC 3 inheritance tests; failure-mode row 3.

### ISS-004 - Drill sessions consumed the free mock

Variant sittings decremented PAY-001's exam-mode limit. Resolved: §1 #3 exemption with AC 3 mock-count check.

### ISS-005 - Untestable randomness

"Adaptive" selection with unseeded randomness had no falsifiable ACs. Resolved: §1 #5 injected-seed determinism; AC 5; policy as pure function (§6).

### ISS-006 - IRT retrofit would rewrite the feature

Draft entangled difficulty logic through selection, session flow, and UI. Resolved: §1 #7 isolates it behind `nextDifficultyBias` with a stub-IRT compile test (AC 7), making the CONTENT-002-triggered upgrade a one-function swap.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 AC 9; #10 AC 10).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: tuning constants (cooldown, caps, lengths) deferred to measured values per §9; no invented numbers.
- SAFE: no untrusted content; no LLM surface.
- Frontmatter: depends_on [LEARN-001, CONTENT-002] reciprocal with both specs' blocks; effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEARN-002 audit._
