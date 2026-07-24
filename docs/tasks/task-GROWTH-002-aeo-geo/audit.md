---
task_id: task-GROWTH-002
audited: 2026-07-17
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 7/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 8 §1 clauses, 8 ACs, 10 failure modes, 8 named tests. The AEO opportunity is implemented with the same boundary discipline as SEO (free-subset only, /api/ protected) plus the two AEO-specific controls: an explicit, configurable AI-crawler policy and quotable units that carry their own compliance context. TRACE families clean. Reciprocity: GROWTH-001's `blocks` carries this task.

## §2 - Findings (all resolved)

### ISS-001 - Crawler policy by omission

Draft said nothing about AI crawler access, defaulting to whatever robots.ts implied - a policy decision made by accident, in either direction. Resolved: §1 #2 explicit enumerated policy with config dial, playbook rationale, and history logging (§11); AC 2.

### ISS-002 - Hand-written llms.txt

A static file would rot at the first exam launch. Resolved: §1 #1 catalog-generated route with drift assertion; AC 1.

### ISS-003 - Quotes stripped of independence context

Assistants quote block-level units; draft placed the disclaimer in the footer only, so citations would carry exam names without the non-affiliation context. Resolved: §1 #3/#4 disclaimer within extractable block scope; AC 4.

### ISS-004 - Stale facts quoted at scale

Fact boxes without dates would propagate outdated prices through assistant answers long after a vendor change. Resolved: dated fact boxes with the verify-with-vendor line (§1 #3, #4); AC 4.

### ISS-005 - Boundary creep into premium/provenance

Draft's llms.txt linked "everything useful", including explanation samples beyond the free line. Resolved: §1 #5 free-surface allowlist with scan AC 5.

### ISS-006 - Unfalsifiable channel

No measurement meant AEO investment could never be evaluated. Resolved: §1 #6 fixed query set + recorded manual cadence + observations table, honest about fidelity limits (§1 #7 attribution labeled approximate); AC 6, 7.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#8 map 1:1 to ACs 1-8.
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: no invented metrics; measurement is a procedure, not a target.
- SAFE: no untrusted content.
- Frontmatter: depends_on [GROWTH-001] reciprocal; priority SHOULD per plan; effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-GROWTH-002 audit._
