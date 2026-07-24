---
task_id: task-SCALE-002
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

Spec is 9 §1 clauses, 8 ACs, 12 failure modes, 9 named tests with offline emulation. The doc's web-first mobile decision ships with its integrity boundaries intact: the never-cache list keeps the PWA from repealing the premium line, grading stays online because answer keys stay server-side, and the kill flag gives service workers the rollback story they notoriously lack. TRACE families clean. Reciprocity: DATA-002's `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Cache-everything worker

Draft used a generic runtime-caching recipe that would persist grades, explanations, and entitlement responses to disk - a premium leak and stale-state factory. Resolved: §1 #2 explicit strategy map with a never-cache list; ACs 2, 8.

### ISS-002 - Offline grading ambition

Draft shipped "full offline mocks" - impossible without shipping answer keys, the platform's core no-go. Resolved: §1 #3/#4 queue-and-sync with grading online-only and honest UI; ACs 3, 4.

### ISS-003 - Double-submission on reconnect

The sync queue replayed answers without idempotency. Resolved: client-id dedupe through the existing answer path; exactly-once fixture in AC 3.

### ISS-004 - No rollback story

A buggy worker would pin clients to broken states with no remedy. Resolved: §1 #7 PWA_ENABLED kill flag with unregister-and-purge AC 6; versioned cache cleanup.

### ISS-005 - Worker intercepting payment routes

Checkout/webhook interception is how PWAs break MoR flows subtly. Resolved: §1 #6 bypass list with AC 5 route assertions.

### ISS-006 - Consent bypass via offline analytics queue

Queuing events offline and flushing on reconnect ignored consent state at flush time. Resolved: §1 #8 consent-aware sync; AC 7.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 AC 3; #6 AC 5; #7 AC 6; #8 AC 7; #9 AC 8).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: prefetch budget deferred to quota-informed implementation (§9).
- SAFE: no untrusted content.
- Frontmatter: depends_on [DATA-002] reciprocal (patched); effort_hours populated; native-app exclusion mirrors the plan's not-tasked list with its revisit trigger recorded.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SCALE-002 audit._
