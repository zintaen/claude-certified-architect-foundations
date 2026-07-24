---
task_id: task-SCALE-003
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

Spec is 9 §1 clauses, 8 ACs, 12 failure modes, 9 named tests. Seats resolve through PAY-001's single access path (no fork of the premium line), provisioning is sales-led-first matching how the doc's B2B buyers actually buy, and the reporting design (aggregates, member opt-in, small-team band suppression) keeps the product from becoming an employer surveillance tool. TRACE families clean. Reciprocity: PAY-002's `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Parallel team-access check

Draft added `isTeamMember()` checks beside `resolveAccess`, forking the access line every gate in waves 2-3 depends on. Resolved: §1 #2 team-derived grants resolved by the one resolver; union-semantics AC 2/3.

### ISS-002 - Per-member score dashboard

Draft showed admins every member's scores and weak domains by default - an employee-monitoring privacy trap and a distortion of honest practice. Resolved: §1 #5 aggregate-only with member opt-in (default off) plus small-team band suppression (§11); AC 5; privacy disclosure §1 #6.

### ISS-003 - Self-serve checkout first

Draft led with Paddle quantity checkout, mismatching how bootcamps/universities buy (invoice + rollout). Resolved: §1 #4 sales-led provisioning script first, self-serve documented as follow-up; AC 4.

### ISS-004 - Seat races oversell

Concurrent invite acceptances on the last seat both succeeded. Resolved: in-transaction occupancy check with concurrency fixture (AC 1); failure-mode row 7.

### ISS-005 - Revocation lag

Draft ended seat grants at day-end batch, leaving revoked members premium for hours. Resolved: §1 #3 revoke-instantly with AC 2 immediate-flip test.

### ISS-006 - SSO/SCIM and whitelabel creep

Draft sketched Okta integration "while we are here" - a security-bar-raising surface smuggled into a seats task. Resolved: §1 #9 fences with the enterprise-deal trigger recorded in §9; AC 8 grep.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 AC 1; #2 ACs 2, 3; #3 AC 1; #4 AC 4; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 AC 8).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: pricing/volume tiers deferred to operator decisions (§9).
- SAFE: no untrusted content.
- Frontmatter: depends_on [PAY-002] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SCALE-003 audit._
