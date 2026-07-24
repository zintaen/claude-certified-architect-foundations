---
task_id: task-LEARN-001
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

Spec is 11 §1 clauses, 10 ACs, 12 failure modes, 11 named tests. The doc's trust-signal requirement ("readiness score with a credible methodology") is implemented as a published methodology page mirroring pure, deterministic composition functions, and the model's downstream role (drilling, study plans) is a versioned exported contract. TRACE families clean. Reciprocity patch applied upstream: DATA-001 and PAY-001 `blocks` lists gained task-LEARN-001.

## §2 - Findings (all resolved)

### ISS-001 - Score presented as pass prediction

Draft copy said "predicts your exam result" - consumer-protection exposure and a credibility time bomb. Resolved: §1 #3 humble-claims register with a lint-enforced prohibited list; AC 4; failure-mode row 3.

### ISS-002 - Scores from tiny samples

Draft computed a score from any nonzero response count. Resolved: §1 #8 sample floors with null-score honest empty states and per-domain `sufficient` flags; AC 3.

### ISS-003 - IRT ambition smuggled in

Draft reached for 2PL ability estimates the data cannot support pre-calibration. Resolved: §1 #11 defers IRT to CONTENT-002's trigger; classical accuracy+coverage+recency model documented as the honest floor; modelVersion field reserves the upgrade.

### ISS-004 - Custom/canary/beta responses polluted mastery

Unfiltered inputs would let SEC-001 canaries and custom-built easy drills skew the model that drilling then consumes. Resolved: §1 #1 exclusions with AC 1 fixtures.

### ISS-005 - Numeric scores flowed into analytics

Draft events carried the raw score, accumulating an undisclosed ability profile in PostHog. Resolved: §1 #10 band-only events; AC 9 payload scan.

### ISS-006 - Downstream tasks would re-derive mastery

LEARN-002/004 each sketched their own accuracy queries. Resolved: §1 #9 exports versioned `weakDomains` as the single model; AC 8; blocks edges recorded.

### ISS-007 - Band thresholds were invented constants

Draft pinned approaching=60/ready=80 with no basis (QA-007). Resolved: config with defaults justified in the methodology doc at implementation (§1 #2, §9); bands framed as guidance, not psychometrics.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#11 all cited (#1 AC 1; #2 AC 2; #3 AC 4; #4 AC 5; #5 AC 6; #6 ACs 6, 7; #7 AC 3; #8 AC 3; #9 AC 8; #10 AC 9; #11 AC 10).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: cleared by ISS-007.
- SAFE: no untrusted content.
- Frontmatter: depends_on [DATA-001, PAY-001] reciprocal (both patched); blocks [LEARN-002, LEARN-004] mirrored in those specs; effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEARN-001 audit._
