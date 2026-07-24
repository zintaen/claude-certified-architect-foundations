---
task_id: task-DATA-001
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 6/10
score_post_revision: 10/10
issues_resolved: 8
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 12 §1 clauses, 13 ACs, 13 failure modes, 13 named integration/unit tests plus two justified manual/scripted checks. Full DDL shape in §3, every doc-named entity present (Vendor, Certification, Exam, Domain/Objective, Item+provenance, Explanation, ItemResponse, User, Attempt-as-sitting, Entitlement, Price). TRACE families clean. Scope fences are explicit: no read-path cutover (DATA-002), no entitlement logic (PAY-001), no auth rework (§9).

## §2 - Findings (all resolved)

### ISS-001 - Column-level exposure of correct_key was unsolved

Draft relied on RLS for content protection, but RLS is row-level: any readable items row exposes the answer key column. Resolved: deny-all RLS + single-point server shaping (§1 #5, #7, #8), pick-list payload construction note (§11), deep-scan AC 4, import-graph AC 9.

### ISS-002 - Money columns were numeric floats

Draft used `numeric(10,2)` for prices, violating the BIGINT-minor discipline and inviting rounding drift across PPP currency tiers. Resolved: §1 #4 bigint `amount_minor` with check constraint; AC 8 asserts column types schema-wide.

### ISS-003 - In-place item edits corrupted response history

Draft had no versioning; editing an item after responses existed would silently invalidate IRT data and regrades. Resolved: §1 #2 version bumps, §1 #3 `item_version` on responses, §1 #8 persisted `question_set`, AC 5 version-pinned grading test.

### ISS-004 - Seed was one-shot and unguarded

A non-idempotent seed would duplicate the bank on re-run and happily import unprovenanced items, breaking CONTENT-001's coverage invariant in the DB world. Resolved: §1 #6 idempotent upserts + provenance gate; AC 3 tests both branches.

### ISS-005 - Beta/canary fielding missing from assembly

Draft assembled from `scored` only, leaving the doc's beta-fielding design (and SEC-001's canary exclusion) to be bolted onto grading later - a high-risk retrofit. Resolved: §1 #8 assembly rules with unscored beta mixing; AC 7 covers scored/beta/canary/retired behaviour.

### ISS-006 - Cutover risk hidden inside this task

Draft flipped the grade route to DB writes directly, coupling schema delivery to a live-traffic behaviour change. Resolved: env-flagged `off|shadow|on` path (§1 #9), byte-compat shadow test AC 11, cutover ownership pinned to DATA-002 (§1 #11, §11 note).

### ISS-007 - RLS guard was a hardcoded table list

A static list would miss the next table added to the migration. Resolved: DO-block guard enumerates dynamically via pg_catalog (§11 note); AC 2's test enumerates the same way (failure-mode row 2).

### ISS-008 - Exam config numbers risked fabrication

Draft hardcoded pass threshold and question count values in the spec body. Resolved: §11 pins seed values to the live site's observed config ("config observed in the repo, not invented"), keeping QA-007 clean.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited by ACs (map: #1 AC 1; #2 ACs 1, 5; #3 ACs 1, 6; #4 ACs 1, 8; #5 AC 2; #6 AC 3; #7 AC 9; #8 ACs 4, 5, 7; #9 ACs 4, 10, 11; #10 ACs 1, 12; #11 ACs 11, 13; #12 AC 1).
- TRACE-002: ACs 12/13 use scripted/manual checks with inline justification (diff properties); all others name §5 tests. TRACE-003: test paths in `new_files`.
- QA-004/007: no invented numeric targets (ISS-008); volume/scaling numbers deferred to triggers.
- SAFE: no untrusted content; no injection surface beyond SQL (parameterized via supabase client, layer-only access).
- Frontmatter: enum-valid; blocks [DATA-002, CONTENT-002, PAY-001] reciprocal with those specs' depends_on; effort_hours populated.

## §4 - Resolution

All 8 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-DATA-001 audit._
