---
task_id: task-PAY-002
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 5/10
score_post_revision: 10/10
issues_resolved: 8
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 12 §1 clauses, 15 ACs, 14 failure modes, 16 named tests. The three doc-mandated disciplines - webhook-only fulfillment, payment-country-corroborated PPP, and EU withdrawal compliance shipping with checkout (the button mandate has been in force since 2026-06-19) - are all normative clauses with matrix-level tests. The enforcement flip is bound to the final human-acceptance gate, closing the loop PAY-001's dark launch opened. TRACE families clean.

## §2 - Findings (all resolved)

### ISS-001 - Fulfillment trusted the client success callback

Draft granted entitlements from Paddle's front-end success event - attacker-controlled input granting paid access. Resolved: §1 #3 webhook-only rule; client callback is UI-state only; ACs 3-5; failure-mode row 1.

### ISS-002 - No idempotency against MoR retries

Paddle retries webhooks aggressively; the draft handler would have granted per delivery. Resolved: event-id dedup enforced at the database (partial unique index, §11), replay AC 4.

### ISS-003 - Tier2 pricing keyed on IP alone

Exactly the arbitrage the doc rates High likelihood. Resolved: §1 #4 settled-tier rule requires payment-country corroboration; VPN plug downgrades display; AC 6 matrix including the deliberate legit-traveler trade-off (failure-mode row 5, support path documented).

### ISS-004 - Discount percentages hardcoded

Draft fixed tier2 at 60% in code - fossilizing an operator pricing lever and inventing a number from the doc's guidance range (QA-007). Resolved: §1 #5 operator-entered prices rows with floor/ceiling caps in the consistency check; AC 1, AC 7.

### ISS-005 - EU withdrawal treated as post-launch polish

The withdrawal-button mandate has been in force since 2026-06-19 - before this spec was written. Draft scheduled it "in a fast-follow". Resolved: §1 #6 ships consent + button with checkout; AC 8-9; failure-mode row 8; consent recorded per transaction in the append-only trail.

### ISS-006 - Unknown webhook events 5xx'd

Returning errors on unrecognized event types converts Paddle's retry policy into a self-inflicted flood. Resolved: log-and-200 rule (§1 #3), AC 5.

### ISS-007 - No reconciliation safety net

Webhook gaps (outage, dropped delivery) would strand paid users invisibly. Resolved: §1 #9 reconcile script with seeded-discrepancy AC 12; support make-goods via PAY-001's audited manual grants.

### ISS-008 - Enforcement flip was a deploy default

Draft set `ENTITLEMENTS_ENFORCED=on` in the production env as part of this task's deploy - an unrecorded business launch. Resolved: §1 #11 binds the flip to the final human-acceptance gate behind the launch checklist with a pre-agreed rollback; AC 14.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited (#1 AC 1; #2 AC 2; #3 ACs 3, 4, 5; #4 ACs 6, 7; #5 ACs 1, 7; #6 ACs 8, 9; #7 AC 10; #8 AC 11; #9 AC 12; #10 AC 13; #11 AC 14; #12 AC 15).
- TRACE-002/003: every AC names §5 tests; paths in `new_files`.
- QA-007: cleared by ISS-004; tier1 country list is initialized from the doc's own enumeration and marked config.
- SAFE: no untrusted quotes; webhook raw-body handling noted (§11) as the injection-adjacent control.
- Frontmatter: depends_on [task-PAY-001] reciprocal with its blocks; effort_hours populated; external entity/MoR onboarding correctly framed as ops-track, not a repo dependency.

## §4 - Resolution

All 8 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-PAY-002 audit._
