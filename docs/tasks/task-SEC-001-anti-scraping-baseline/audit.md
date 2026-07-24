---
task_id: task-SEC-001
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

Spec is 11 §1 clauses, 11 ACs, 12 failure modes, 15 named tests. TRACE clean; all §5 paths in `new_files`. Class `improvement` is correct: hardening with no user-visible behaviour change. The spec's strongest property is honesty about its own boundary - request-level defenses cannot protect a bank that ships in the client bundle, and the deferral to task-DATA-001 is stated in-spec (§1 #11) instead of implied.

## §2 - Findings (all resolved)

### ISS-001 - Serverless in-memory limiter oversold

First draft presented the in-memory token bucket as "the rate limiter", ignoring that per-lambda state leaks under distributed scraping. Resolved: §1 #2 pluggable store with Redis path, mandatory documentation of the limitation, failure-mode row 1; AC 2.

### ISS-002 - Fail-open vs fail-closed for Turnstile was undecided

Draft left outage behaviour to the implementer - the exact kind of silent policy decision that surfaces in an incident. Resolved: §1 #5 fixes fail-open with logging and requires the rationale in the module header; AC 5 tests the outage path.

### ISS-003 - Canaries could poison scoring

Draft mixed canaries into all pools; a learner answering an unanswerable decoy would lose points and leaderboard position. Resolved: §1 #6 excludes canaries from scoring, readiness, and leaderboard, restricts them to practice pools at a documented frequency; AC 6 covers all three exclusions.

### ISS-004 - IP keying trusted x-forwarded-for

Spoofable header keying would let a scraper mint fresh buckets per request. Resolved: §1 #3 platform-IP-only rule; unit AC 3.

### ISS-005 - robots change risked page deindexing

An unscoped robots edit could disallow more than /api/. Resolved: §1 #8 confines the change and AC 8 asserts page routes untouched; failure-mode row 8; SEO ownership pinned to task-SEO-001.

### ISS-006 - Budgets were invented numbers

Draft hardcoded "60 req/min" style figures with no source, violating anti-fabrication (QA-007). Resolved: §9 defers concrete numbers to measured legitimate peaks with the 3x headroom rule as the normative constraint; AC 10 tests the rule's observable consequence (zero 429s on a full exam).

### ISS-007 - Public/server question split unprotected

The only current answer-key boundary was conventional. Resolved: §1 #7 pins the split with an import-graph/grep test; AC 7; failure-mode row 11 documents the residual bundle-exposure risk with its DATA-001 hand-off.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#11 all cited (#1 by ACs 1, 3; #2 by AC 2; #3 by AC 3; #4 by AC 4; #5 by AC 5; #6 by AC 6; #7 by AC 7; #8 by AC 8; #9 by AC 9; #10 by AC 10; #11 by AC 11).
- TRACE-002/003: every AC names §5 entries; all paths in `new_files`; no manual verifications.
- QA-007: no unsourced numeric targets remain (see ISS-006).
- SAFE families: no untrusted quotes; canary uniquePhrase strings are self-authored.
- Frontmatter: enum-valid, `class: improvement` consistent with backlog tagging, reciprocity n/a (no hard edges; related_tasks only).

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SEC-001 audit._
