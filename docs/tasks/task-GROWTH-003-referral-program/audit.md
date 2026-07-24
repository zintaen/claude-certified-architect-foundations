---
task_id: task-GROWTH-003
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

Spec is 9 §1 clauses, 9 ACs, 12 failure modes, 12 named tests. The reward loop rides PAY-001's audited grant path end to end (no new value machinery), qualification is activation-gated against farming, and the consent-free attribution design keeps the LEGAL-002 posture intact. TRACE families clean. Reciprocity: PAY-001 and OBS-001 `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Signup-gated rewards

Draft rewarded on signup - farmable with disposable emails within hours. Resolved: §1 #3 activation gate (first completed mock, the OBS-001 KPI); AC 3; failure-mode row 1.

### ISS-002 - Cash-adjacent rewards

Draft offered discount codes, which stack against PPP tiers into arbitrage and create promotion-management surface outside the MoR flow. Resolved: §1 #4 premium-days-only through grantEntitlement; §2 rationale; fence AC 9.

### ISS-003 - Attribution broke under default-deny consent

Draft used an analytics-cookie attribution chain that dies when the user rejects consent - most of the funnel. Resolved: §1 #2 first-party visit-parameter mechanism tested under rejected consent (AC 2).

### ISS-004 - Rewards during the all-free era

Granting premium days before enforcement exists grants nothing, and skipping early sharers at flip time would be unfair. Resolved: §1 #7 defer-and-backfill with idempotent flip-time issuance; AC 7.

### ISS-005 - Unbounded farming past the honest path

No caps or anomaly handling in the draft. Resolved: §1 #5 velocity limits (SEC-001 store), monthly cap, anomaly hold with operator disposition through the audited script; ACs 4, 5.

### ISS-006 - Concurrent qualification double-rewards

Two simultaneous grade events for the referred user's first mock both triggered issuance. Resolved: once-only in-transaction qualification with concurrency AC 3.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 AC 1; #2 ACs 1, 2; #3 AC 3; #4 AC 4; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 AC 9).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: reward amounts/caps deferred to operator config (§9); no invented values.
- SAFE: no untrusted content.
- Frontmatter: depends_on [PAY-001, OBS-001] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-GROWTH-003 audit._
