---
task_id: task-CONTENT-002
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

Spec is 14 §1 clauses, 13 ACs, 14 failure modes, 18 named tests across unit + integration with a mocked batch transport. All seven pipeline steps from the source doc's §D are present and normative, the cost strategy (§F batch + caching + pre-generation) is enforced as clauses rather than aspiration, and the two upstream contracts (DATA-001 schema, CONTENT-001 provenance/similarity) are consumed by import, not duplication. TRACE families clean.

## §2 - Findings (all resolved)

### ISS-001 - Input legitimacy was a policy, not a mechanism

Draft said prompts "should only use blueprints" - unenforceable. Resolved: §1 #2 allowlist architecture (two permitted roots, startup refusal, prompt-assembler test with poisoned fixture); AC 2; failure-mode row 1.

### ISS-002 - SME sign-off happened after insertion

Draft inserted generated items as beta and queued review "before scoring", letting unreviewed AI content reach learners in unscored slots. Resolved: §1 #7 verdict-gated insertion (no approved row, no items row); AC 7; §2 rationale.

### ISS-003 - Psychometric thresholds were textbook constants

Draft pinned p-value 0.3-0.9 and point-biserial 0.2 as spec constants - unsourced for this audience (QA-007). Resolved: §1 #10 fixes the mechanism (minResponses + bounds + human disposition) and sources numbers from the first cohort's measured distribution, recorded in PIPELINE.md; AC 10 tests mechanics against hand-checked fixtures.

### ISS-004 - Auto-retirement on stat degradation

Draft auto-retired weak scored items - silent bank shrinkage on noisy data. Resolved: §1 #10 prohibits auto-retire; degradation emits a `revise` review row for human disposition; AC 10; failure-mode row 9.

### ISS-005 - Vendor guard had an override flag

Draft included `--force-vendor` for prohibited vendors "with extra review" - exactly the flag that gets used under pressure against an explicit vendor prohibition. Resolved: §1 #12 removes override entirely; compliant support requires its own task; AC 11 asserts the CLI schema.

### ISS-006 - Budget cap applied after submission

Draft checked spend post-hoc from the batch invoice. Resolved: §1 #13 pre-submission estimate with hard abort; dry-run default; AC 12; failure-mode row 6.

### ISS-007 - Explanations could go stale against revised items

Nothing tied `explanations` to item versions; a reviser pass would leave rationale describing old text. Resolved: explain stage keys on item version (failure-mode row 7, §11 note); regeneration on version bump.

### ISS-008 - Rejected items lost their audit trail

FK from item_reviews to items would delete or orphan review history for rejected items - the trail that proves review happened. Resolved: `item_ref` without FK, documented in the migration comment (§11); review rows persist for all outcomes.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#14 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 AC 5; #6 AC 6; #7 AC 7; #8 AC 8; #9 AC 9; #10 AC 10; #11 AC 10; #12 AC 11; #13 AC 12; #14 AC 13).
- TRACE-002/003: every AC names §5 tests; paths in `new_files`; no manual verifications.
- QA-004/007: cleared by ISS-003; spend/count figures in §8 are illustrative payload examples, not targets.
- SAFE: untrusted-content discipline appears as the allowlist (model outputs are treated as data, never as instructions; prompts logged verbatim for audit).
- Frontmatter: depends_on [DATA-001, CONTENT-001] reciprocal with their blocks; blocks [CONTENT-003] mirrored there; effort_hours populated.

## §4 - Resolution

All 8 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-CONTENT-002 audit._
