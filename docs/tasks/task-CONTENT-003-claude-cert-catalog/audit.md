---
task_id: task-CONTENT-003
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

Spec is 12 §1 clauses, 11 ACs, 12 failure modes, 11 named tests plus one justified diff-review verification. The spec resolves the bootstrap contradiction between CONTENT-002's beta-only insertion and launching zero-history exams, honors the source doc's own caveat about third-party exam facts, and keeps the launch surface registry-driven so the next vendor ring costs content, not engineering. TRACE families clean.

## §2 - Findings (all resolved)

### ISS-001 - Bootstrap contradiction with CONTENT-002

Applying CONTENT-002's rules literally (insert as beta; promote only on response stats) makes a new exam unlaunchable: no scored items, no scorable sittings, no responses. Draft ignored this. Resolved: §1 #4 governed launch-cohort bootstrap - operator-recorded decision, `calibration: provisional` provenance, mandatory first-threshold re-verdict; AC 4; §2 rationale.

### ISS-002 - Source-doc exam facts repeated as truth

Draft copied the four exams' prices/dates/codes from the plan doc directly onto landing pages, but the doc itself warns its Anthropic details are third-party-sourced. Resolved: §1 #1 verification-at-authoring rule (official guides win), §1 #2 site_default labeling for unpublished facts, ACs 1-2, failure-mode row 1.

### ISS-003 - Page-per-exam components

Draft built dedicated CCAO/CCDV/CCAR-P page components - three launches of engineering per launch, contradicting the expansion economics. Resolved: §1 #5 registry-driven templates with the fixture-exam AC 5 ("exam five costs zero components").

### ISS-004 - /exams/ccaf mirror would have been auto-generated

The template index would have emitted CCAF under the new namespace, splitting the exact equity SEO-001 protects. Resolved: §1 #6 with AC 6 route test; index special-case documented.

### ISS-005 - Coupled launches

One go-live for all three exams held ready content hostage to the slowest SME queue. Resolved: §1 #11 per-exam status flips + checklist rows; AC 10 independence test; failure-mode row 4.

### ISS-006 - Price staleness unhandled

Vendor prices already changed once (CCAF $99 to $125 per the doc); static price copy would rot misleadingly. Resolved: §1 #9 config-rendered logistics with retrieval date and verify-with-vendor line; AC 2; failure-mode row 2.

### ISS-007 - Monetization creep risk

"Ship exams" invites bundling the paywall. Resolved: §1 #12 explicit fence (Phase 3 owns it), AC 11 diff review; phase order preserved.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 ACs 2, 9; #10 AC 9; #11 AC 10; #12 AC 11).
- TRACE-002: AC 11 is a justified review-fact; all others name §5 tests. TRACE-003: test path in `new_files`.
- QA-004/007: bank-size targets deliberately not invented (§9); prices carried as sourced-config examples, not spec constants.
- SAFE: no untrusted content blocks required.
- Frontmatter: depends_on [task-CONTENT-002] reciprocal with its blocks; effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-CONTENT-003 audit._
