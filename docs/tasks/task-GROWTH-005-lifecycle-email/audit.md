---
task_id: task-GROWTH-005
audited: 2026-07-17
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

Spec is 8 §1 clauses, 9 ACs, 12 failure modes, 9 named tests. The doc's post-pass-churn counter (multi-cert nudges) ships registry-driven, consent boundaries are structural (audience allowlists + queue-level suppression), and the no-pixel decision keeps the email channel consistent with the site's privacy posture. TRACE families clean. Reciprocity: OBS-001 and PAY-001 `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Sends to non-consented users

Draft's win-back targeted "all users inactive 4 weeks" - including exam-takers who never joined the list. Resolved: §1 #2/#8 audience allowlists (subscribers or action-takers only) with the bare-exam-taker fixture in AC 2.

### ISS-002 - Per-template unsubscribe checks

Compliance by convention across templates guarantees a missed check eventually. Resolved: §1 #2 queue-level suppression exclusion; AC 3.

### ISS-003 - Open/click pixels

Draft added beacon tracking, contradicting the default-deny analytics posture the whole P0 wave established. Resolved: §1 #7 no-pixel rule with grep AC 9; UTM-only measurement.

### ISS-004 - Non-idempotent queue

A re-run after a partial failure re-sent the batch. Resolved: §1 #4 send-log uniqueness + caps + error-halt; AC 4 double-run and error fixtures.

### ISS-005 - Hardcoded multi-cert recommendations

The churn-counter template named CCDV-F literally, rotting at the next catalog change. Resolved: §1 #5 registry-adjacency recommendations; AC 6 fixture-exam test.

### ISS-006 - Receipt duplication with the MoR

Draft sent purchase confirmations, colliding with Paddle's seller-of-record receipts. Resolved: §1 #8 fence; §2 rationale; failure-mode row 10.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#8 all cited (#1 AC 1; #2 ACs 2, 3; #3 AC 5; #4 AC 4; #5 ACs 6, 7; #6 AC 8; #7 AC 9; #8 ACs 2, 9).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: sequence timings/caps deferred to operator config (§9).
- SAFE: no untrusted content.
- Frontmatter: depends_on [OBS-001, PAY-001] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-GROWTH-005 audit._
