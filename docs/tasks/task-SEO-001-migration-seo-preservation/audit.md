---
task_id: task-SEO-001
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

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 7 named tests plus three justified review-fact verifications. It converts the doc's highest-rated migration risk into mechanical gates: a frozen, signature-bearing URL contract, single-module 301 discipline, and a monitoring procedure whose rollback trigger is deliberately operator-set. Scope fences hold (no growth SEO, no host change).

## §2 - Findings (all resolved)

### ISS-001 - 200-only checks would miss content swaps

First draft verified status codes; a cutover serving the wrong page on the right URL would pass while rankings died. Resolved: §1 #1 signatures (title + h1) per contract entry; AC 2.

### ISS-002 - Canonical rule for the future namespace was ambiguous

Draft reserved `/exams/[code]` without deciding what happens if CCAF mirrors appear - the exact ambiguity that produces duplicate-content splits. Resolved: §1 #3 fixes legacy-URLs-stay-canonical as the recorded default, AC 4 tests mirror absence, §9 routes any reversal through an operator task.

### ISS-003 - Rollback threshold was an invented percentage

Draft said "rollback on >20% traffic drop" - an unsourced number (QA-007). Resolved: §1 #7 makes the threshold operator-set with the baseline in hand, pre-committed in the monitoring doc before the first flip; AC 7 verifies the slot and the review gate.

### ISS-004 - Sitemap and contract could drift

Two hand-maintained lists of "all URLs" guarantee divergence. Resolved: §1 #4 shared route source with set-equality test AC 1.

### ISS-005 - No fast signal for broken legacy URLs

Draft relied on Search Console crawl errors (days of latency) as the only 404 detector. Resolved: §1 #6 middleware counter `seo.contract_404` with low-cardinality labels (§11), AC 6 probe test.

### ISS-006 - Suite was not wired to the cutover it protects

A green suite nobody runs at flip time protects nothing. Resolved: §1 #8 makes the suite a precondition in DATA-002's flip checklist (cross-doc reference, AC 8), and the monitoring schedule includes post-flip production runs (failure-mode row 10).

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (#1 ACs 1, 2; #2 ACs 2, 3; #3 AC 4; #4 AC 1; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 AC 9; #10 AC 10).
- TRACE-002: ACs 8-10 are review-fact/cross-doc verifications with inline justification; the rest name §5 tests. TRACE-003: the single spec file path is in `new_files`.
- QA-007: cleared via ISS-003.
- SAFE: no untrusted content.
- Frontmatter: depends_on [task-DATA-002] reciprocal with DATA-002's blocks; effort_hours populated; class product (user-facing distribution surface preservation).

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SEO-001 audit._
