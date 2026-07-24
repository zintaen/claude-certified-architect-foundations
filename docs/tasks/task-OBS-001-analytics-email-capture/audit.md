---
task_id: task-OBS-001
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

Spec is 10 §1 clauses, 12 ACs, 12 failure modes, 13 named tests. TRACE clean: every clause has a citing AC, every AC a §5 entry, all §5 paths in `new_files`. One plan amendment surfaced and recorded: a hard `depends_on: [task-LEGAL-002]` edge (consent gate), with reciprocal `blocks` patched onto task-LEGAL-002 - reciprocity sweep passes post-patch.

## §2 - Findings (all resolved)

### ISS-001 - Undeclared dependency on the consent module

Draft consumed `src/lib/consent.ts` while frontmatter claimed no dependencies, violating reciprocity rules and hiding a real build-order constraint. Resolved: `depends_on: [task-LEGAL-002]` added, reciprocal `blocks` recorded on LEGAL-002, amendment noted in §7 and the batch report.

### ISS-002 - Consent treated as one-shot

Draft initialized PostHog once at accept and ignored revocation. Resolved: §1 #2 requires runtime subscribe/deactivate plus storage clearing; AC 2; failure-mode row 2.

### ISS-003 - Raw email in identify calls

Draft identified users by email to "make funnels joinable", contradicting the PII posture and expanding the privacy disclosure. Resolved: §1 #4 hash-only identity, no raw-email API surface exists in the contract; AC 6 asserts at the transport layer.

### ISS-004 - Unbounded event volume

`question_answered` per-question emission meant 100 network sends per sitting and an unbounded PostHog bill under viral load. Resolved: §1 #10 sampling/batching with a documented budget; AC 11; failure-mode row 6.

### ISS-005 - Baseline existed only as UI dashboards

The migration-regression baseline (the doc's stated reason for this task) had no reviewable artifact. Resolved: §1 #5 requires `docs/analytics-baseline.md` with definitions, funnel recipes, and the 14-day pre-cutover floor that DATA-002's gate cites; AC 7.

### ISS-006 - Taxonomy fork risk with legacy track.ts

New wrapper plus old tracker would create two event-name sources. Resolved: §1 #3 routes track.ts through the typed map as delegates; AC 3 (grep single-import) and AC 5 (type-level) enforce it.

### ISS-007 - OTel collateral damage unguarded

Layout and instrumentation changes could silently break the existing ops telemetry. Resolved: §1 #9 explicit non-goal with AC 10 smoke assertion.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (map: #1 by ACs 3, 4; #2 by ACs 1, 2; #3 by AC 5; #4 by AC 6; #5 by AC 7; #6 by AC 8; #7 by AC 9; #8 by AC 12; #9 by AC 10; #10 by AC 11).
- TRACE-002/003: all §5 paths in `new_files`; no manual verifications claimed.
- QA-004: the 14-day window is labeled a floor from doc intent, not a fabricated statistical target; sampling budget deliberately left to implementation with AC tied to the documented value (no invented number).
- SAFE families: no untrusted content; no injection surface.
- Frontmatter: enum-valid, effort_hours set, depends_on/blocks reciprocal with LEGAL-002 (patched) and DATA-002 (declared here, mirrored in DATA-002's spec).

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-OBS-001 audit._
