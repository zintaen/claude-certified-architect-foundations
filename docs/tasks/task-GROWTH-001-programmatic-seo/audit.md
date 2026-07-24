---
task_id: task-GROWTH-001
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

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 10 named tests. The doc's §E playbook is implemented with its own guardrails: the index-threshold gate makes "genuine free value" computable, the free-subset cap keeps SEO from repealing pricing, and the closed intent set fences doorway-page drift. TRACE families clean. Reciprocity: CONTENT-003 and SEO-001 `blocks` gained this task (patched); GROWTH-002 dependency mirrored.

## §2 - Findings (all resolved)

### ISS-001 - Thin pages indexed at launch

Draft indexed all intent pages the moment an exam went live, shipping three near-empty pages per new exam - the exact duplicate/thin-content pattern the doc warns against. Resolved: §1 #2 computed index gate with sitemap/contract coupling; AC 2 threshold-flip test.

### ISS-002 - SEO pages leaked past the free line

Draft rendered "as many questions as possible" inline for dwell time, silently widening the free tier and re-exposing the bank. Resolved: §1 #3 free-subset boundary + shaping-path rendering; AC 3.

### ISS-003 - Intent clones

The three templates as first drafted differed by H1 only. Resolved: §1 #1 intent-distinct content model with differing signatures asserted by AC 1.

### ISS-004 - Schema over-markup

Draft emitted FAQPage markup for FAQs that rendered only in a collapsed client component - markup for invisible content. Resolved: §1 #5 visibility-truth rule; AC 5 hidden-FAQ fixture fails.

### ISS-005 - Orphan generation

Programmatic pages reachable only via sitemap have weak discovery and no equity flow. Resolved: §1 #4 mesh with link-graph reachability AC 4.

### ISS-006 - CCAF namespace collision unaddressed

Intent pages under /exams/ccaf would violate SEO-001's canonical default. Resolved: §1 #6 explicit special-case with documented resolution; AC 6.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (map 1:1 with ACs 1-10).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: minFreeItems deferred to the PAY-001-coupled decision (§9); no invented thresholds.
- SAFE: no untrusted content.
- Frontmatter: depends_on [CONTENT-003, SEO-001] reciprocal (patched); blocks [GROWTH-002] mirrored; phase P4 extends the phase axis consistently with the source doc's staging.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-GROWTH-001 audit._
