---
task_id: task-LEARN-003
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

Spec is 10 §1 clauses, 9 ACs, 12 failure modes, 12 named tests. The scheduler is a pure function pinned to published FSRS reference vectors (the doc's learning-science claim made testable), the card lifecycle is upsert-safe with canary exclusion, and review answers feed the single item_responses truth stream. TRACE families clean. Reciprocity: DATA-001 and PAY-001 `blocks` lists carry task-LEARN-003 (patched upstream).

## §2 - Findings (all resolved)

### ISS-001 - "Interval-ish" scheduler sold as FSRS

Draft implemented ad-hoc doubling intervals under the FSRS name - the learning-science backing the doc cites attaches to the real algorithm. Resolved: §1 #1 reference-vector validation with cited fixtures; AC 1; SM-2 fallback documented rather than silent.

### ISS-002 - Everything auto-enrolled

Draft carded every answered question, right or wrong, flooding queues into guilt-abandonment. Resolved: §1 #3 miss-only auto-cards + explicit flashcard opt-in; §1 #5 bounded daily queue with carry; failure-mode rows 4, 5.

### ISS-003 - Duplicate cards on repeated misses

Re-missing an item inserted a second card. Resolved: upsert against unique(user_id, card_kind, card_ref); AC 2.

### ISS-004 - Review rendering bypassed the shaping path

Draft fetched item rows directly for review display, reopening the answer-leak class DATA-001 closed. Resolved: §1 #4 renders through the shaping path with AC 3 leak scan.

### ISS-005 - Server-UTC due dates

"Due today" computed at UTC midnight is wrong by seven hours for the home market. Resolved: §1 #8 client tzOffset in the contract; AC 7 UTC+7 fixture.

### ISS-006 - Cards deleted on exam pass

Draft cleaned up cards at pass time - destroying the multi-cert retention asset the doc's churn strategy depends on. Resolved: §1 #7 user-decides rule; AC 6.

### ISS-007 - Parallel SRS ability ledger

Draft stored review correctness only in review_cards, forking ability evidence away from mastery and calibration. Resolved: §1 #4 item reviews write item_responses (variant `review`); AC 3; failure-mode row 9.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (#1 AC 1; #2 AC 2; #3 AC 2; #4 AC 3; #5 AC 4; #6 AC 5; #7 AC 6; #8 AC 7; #9 AC 8; #10 AC 9).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: dailyCap/requestRetention defaults deferred to FSRS's published defaults + cohort tuning (§9); no invented constants.
- SAFE: no untrusted content.
- Frontmatter: depends_on [DATA-001, PAY-001] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEARN-003 audit._
