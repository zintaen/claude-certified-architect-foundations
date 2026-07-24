---
task_id: task-AI-001
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

Spec is 12 §1 clauses, 11 ACs, 14 failure modes, 13 named tests against a mocked adapter. The doc's cost doctrine is architecture here: a three-rung serving ladder, fail-closed persisted budgets, a global breaker, and a closed intent set that bounds both the injection and cache-poisoning surfaces. Exam integrity (no tutor mid-mock) and pre-grade answer-key withholding protect the product's two core assets. TRACE families clean. Reciprocity: PAY-001 and CONTENT-002 `blocks` lists carry task-AI-001 (patched upstream).

## §2 - Findings (all resolved)

### ISS-001 - Live-first serving

Draft called the model on every tutor question, treating pre-generated explanations as a fallback - inverting the doc's economics. Resolved: §1 #1 mandatory ladder order with call-count AC 1.

### ISS-002 - In-memory budgets

Per-lambda counters reset per instance (the SEC-001 lesson re-learned); a scraper or enthusiast crowd would never hit a cap. Resolved: §1 #3 persisted ledger with atomic in-transaction increments; concurrent no-overspend fixture AC 2.

### ISS-003 - Caps failed open

Draft proceeded with live calls when the ledger read errored - an outage became an uncapped day. Resolved: §1 #2 fail-closed rule with AC 3 simulation.

### ISS-004 - Free-text cache keys

Caching answers under user question text was a poisoning vector (crafted question -> poisoned answer served to others) and an unbounded key space. Resolved: §1 #8 closed intent set as the only cache key; user text never persists; AC 8 write-path scan.

### ISS-005 - Answer key in pre-grade prompts

Draft assembled the full item row (including correct_key) into every tutor context - the tutor would happily reveal answers before submission. Resolved: §1 #4 phase-aware context assembly with deep prompt scan AC 4.

### ISS-006 - Tutor available mid-mock

Nothing excluded the tutor from in-progress timed sittings, collapsing mock integrity (and the leaderboard/readiness meaning built on it). Resolved: §1 #5 surface rules with AC 5.

### ISS-007 - Budget amounts invented

Draft pinned "50k tokens/day, $50/day global" - operator pricing decisions written as spec constants (QA-007). Resolved: §7/§9 mechanism-normative framing; amounts live in TUTOR_CONFIG at deploy, tuned via the observability this task ships.

### ISS-008 - Privacy disclosure gap

Question text flows to an AI provider, but no sub-processor row existed. Resolved: §1 #6 adds the privacy-page row in this task's diff; PII-field payload scan AC 6.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#12 all cited (#1 AC 1; #2 ACs 2, 3; #3 AC 2; #4 AC 4; #5 ACs 5, 9; #6 AC 6; #7 AC 7; #8 AC 8; #9 no AC - explicitly MAY with a MUST-NOT guard folded into AC 8/9 machinery; #10 AC 9; #11 AC 10; #12 AC 11). The single MAY clause carries no unconditioned obligation, satisfying the traceability rule.
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: cleared by ISS-007.
- SAFE-001..004: untrusted-content wrapping is itself a normative clause (§1 #4) with a hostile fixture; no unwrapped quotes in the spec.
- Frontmatter: depends_on [PAY-001, CONTENT-002] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 8 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-AI-001 audit._
