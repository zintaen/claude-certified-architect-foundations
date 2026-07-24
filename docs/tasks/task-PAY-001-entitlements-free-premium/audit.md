---
task_id: task-PAY-001
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

Spec is 11 §1 clauses, 12 ACs, 12 failure modes, 12 named tests. The dark-launch invariant (byte-identical payloads with enforcement off, proven by recorded fixtures) cleanly separates engineering risk from the pricing-line business decision, and the append-only event trail gives PAY-002's webhook fulfillment a single audited write path. TRACE families clean.

## §2 - Findings (all resolved)

### ISS-001 - Enforcement was live-on-merge

Draft enabled gating as soon as the code shipped, coupling a serving-path refactor to the goodwill-sensitive business flip the doc explicitly worries about. Resolved: §1 #6 dark launch with default-off flag; AC 8 fixture byte-identity; the flip is PAY-002's human gate.

### ISS-002 - Free cap was a metered rotation

Draft metered "first N seen questions" per user - which leaks the full bank to patient users and makes the free tier feel like surveillance. Resolved: §1 #5 stable curated subset with AC 5 set-equality property; §2 rationale ties it to the doc's free-forever framing.

### ISS-003 - Entitlement history was mutable

Draft updated `entitlements` rows in place with no event trail - the first payment dispute would have nothing to replay. Resolved: §1 #3 append-only `entitlement_events` with SQL-level revoke; AC 3; single write path `grantEntitlement` (§11).

### ISS-004 - Mock-limit race

Two parallel session starts both passed the "used 0 of 1 mocks" check. Resolved: count check inside the assembly transaction (§11 note); AC 6 includes the double-start test; failure-mode row 8.

### ISS-005 - Cap default was invented

Draft hardcoded `free_question_cap: 30` as a spec constant; the doc gives a 20-40 range and the plan approval left the exact value open. Resolved: §1 #4 config-driven with operator-set default citing the range; §9 records the deferral (QA-007 clean).

### ISS-006 - Prompts could ship dark-pattern copy

Nothing constrained upsell copy against fake urgency - a trust defect in a trust-positioned product. Resolved: §1 #7 honest-copy rule with the static lint list (AC 9, §11).

### ISS-007 - Anonymous users were an undefined tier

Resolution assumed a userId; anonymous practice (most traffic) would have hit undefined paths at enforcement time. Resolved: §3 contract types `userId: string | null` with anonymous = free always; AC 2 anonymous fixture; failure-mode row 12.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#11 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 ACs 5, 6, 7; #6 AC 8; #7 ACs 8, 9; #8 AC 10; #9 AC 11; #10 AC 12; #11 AC 12).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: cleared by ISS-005.
- SAFE: no untrusted content.
- Frontmatter: depends_on [task-DATA-001] and blocks [task-PAY-002] reciprocal; effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-PAY-001 audit._
