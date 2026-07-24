---
task_id: task-LEGAL-002
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 7/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 12 §1 clauses, 12 ACs, 13 failure modes, 13 named tests plus one justified manual verification (diff-property AC 12). TRACE families clean: every clause cited by an AC, every AC backed by a §5 entry, all test paths in `new_files`. The one manual verification (no new PII / no third-party scripts) is a diff property, not runtime behaviour, and carries its justification inline per TRACE-002.

## §2 - Findings (all resolved)

### ISS-001 - Consent/analytics race was unowned

First draft gated analytics "at integration time", leaving the pre-consent window ambiguous between this task and OBS-001. Resolved: §1 #7 makes default-deny + the single gate function this task's contract; OBS-001 consumes it; failure-mode row 1; AC 7.

### ISS-002 - Reject was cheaper than accept

Draft persisted acceptance in a cookie but rejection only in memory - a classic dark pattern and a GDPR defect. Resolved: §1 #6 "Rejecting MUST be as durable as accepting"; unit durability test both branches; failure-mode row 4; AC 6.

### ISS-003 - SSR crash path in consent lib

`getConsent()` reading `document.cookie` during server render would crash static generation of every page (banner mounts in root layout). Resolved: §3 contract marks getConsent SSR-safe with a dedicated unit test; failure-mode row 3.

### ISS-004 - Refund terms were being invented

Draft sketched a 14-day refund window for products that do not exist, fabricating an obligation with no source. Resolved: §1 #9 forbids inventing windows, page carries slots for PAY-002; AC 9 asserts the absence; anti-fabrication note in §2.

### ISS-005 - GPC not considered

CCPA/CPRA scope was claimed in the privacy page while the code ignored the Global Privacy Control signal. Resolved: §1 #8 SHOULD-clause with standing-rejection semantics, unit test, AC 8.

### ISS-006 - Policy versioning had no enforcement

"Keep policies versioned" had no mechanism. Resolved: `PolicyMeta` typed constants rendered on-page (§1 #10), e2e render test, changelog requirement, failure-mode row 6.

### ISS-007 - Counsel review was implied but not gated

Draft treated drafted policy text as publishable. Resolved: §1 #11 binds publication to the ship-tasks final-acceptance HITL with reviewer attestation; AC 11; §9 keeps the operator action visible.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited (AC map 1:1 with clause list; #6 by ACs 6, #7 by AC 7, #12 by AC 12). No deferred clauses.
- TRACE-002/003: all §5 paths in `new_files`; manual entry justified inline.
- QA-004: no invented numeric targets (12-month cookie max-age sourced from consent-duration convention stated in contract; refund windows explicitly not invented).
- QA-006: scope + non-goals explicit (§1 #12).
- SAFE-001..004: no untrusted quotes; no injection surface.
- Frontmatter: enum-valid status, effort_hours set, reciprocity n/a (no depends_on/blocks), related_tasks link the consumers.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEGAL-002 audit._
