---
task_id: task-DATA-002
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

Spec is 12 §1 clauses, 12 ACs, 13 failure modes, 11 named tests plus two justified review-fact verifications. The zero-downtime story is structurally enforced (legacy writes continue through soak; rollback = flag flip; removal is a separate slice), and both hard dependencies (DATA-001 schema/flags, OBS-001 baseline) are consumed by reference instead of re-invented. TRACE families clean.

## §2 - Findings (all resolved)

### ISS-001 - Client-persisted state was outside the migration's universe

Draft migrated Supabase tables only; streaks/resume state living in localStorage (the doc explicitly names streaks) had no owner. Resolved: §1 #1 inventory includes grep-enumerated localStorage keys with forced dispositions; AC 1; failure-mode row 1; §9 keeps the honest keep-in-place path.

### ISS-002 - History backfill fabricated per-item responses

Draft synthesized item_responses from aggregate scores to "complete" the IRT feed - plausible-looking fabricated data in the exact table CONTENT-002 will calibrate on. Resolved: §1 #3 prohibition, AC 3 aggregate-only fixture, §2 rationale.

### ISS-003 - Single cutover flag concentrated blast radius

One `USE_NEW_DB` flag meant any surface bug rolled back everything. Resolved: §1 #6 per-surface flags with independent revert; AC 7 flag-matrix e2e.

### ISS-004 - Rollback quietly required a reverse migration

Draft stopped legacy writes at first flag flip, so reverting reads would have served stale legacy data. Resolved: §1 #7 keeps legacy writes through the whole soak; rollback is read-flag-only; failure-mode row 8; AC 8 pins legacy-removal out of this task's diff.

### ISS-005 - Soak length and regression thresholds were invented

Draft hardcoded "7 days" and "5% regression" with no source (QA-007). Resolved: §1 #5/#8 consume the 14-day floor and variance band from `docs/analytics-baseline.md` (OBS-001's artifact); §9 leaves the ceiling to operator judgment explicitly.

### ISS-006 - Scripts defaulted to writing

Execute-by-default backfills against production are how test runs become incidents. Resolved: §1 #4 dry-run default with `--execute`, AC 5, failure-mode row 5.

### ISS-007 - Rehearsal was advisory

"Should rehearse on staging" had no teeth. Resolved: §1 #10 mandatory rehearsal with recorded results in mapping doc §5, AC 11 makes the record a review gate; privacy handling of rehearsal dumps covered by §1 #12 / AC 12.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 ACs 4, 5; #5 AC 6; #6 AC 7; #7 AC 8; #8 AC 9; #9 AC 10; #10 AC 11; #11 AC 8; #12 AC 12).
- TRACE-002: ACs 8 and 11 are review-fact verifications with inline justification; all others name §5 tests. TRACE-003: test paths in `new_files`.
- QA-007: cleared by ISS-005 (thresholds sourced, not invented).
- SAFE: no untrusted content; egress grep (AC 12) is the injection-adjacent control for scripts.
- Frontmatter: depends_on [task-DATA-001, task-OBS-001] reciprocal with their blocks entries; blocks [task-SEO-001] mirrored in SEO-001's depends_on; effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-DATA-002 audit._
