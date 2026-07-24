---
task_id: task-LEGAL-001
audited: 2026-07-16
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 7/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 10 named tests across unit + e2e + one scripted negative path. Every BCP-14 clause traces to at least one AC (TRACE-001 sweep below); every AC cites §5 entries that live in `frontmatter.new_files` (TRACE-002/003 clean). No fabricated metrics; the only quoted legal sentence is sourced from the plan doc's disclaimer template. Scope guard (§1 #9) fences URL changes out to task-SEO-001.

## §2 - Findings (all resolved)

### ISS-001 - Banned-descriptor guard matched inside longer words

First draft's rule A would flag "unofficial" and "officially", guaranteeing developer bypass of a noisy gate. Resolved: word-boundary matching required in §3 contract and pinned by a dedicated unit test; AC #4.

### ISS-002 - Exam route can suppress the footer, silently dropping the disclaimer

The exam page renders a focused UI; layout-footer mounting alone could leave the highest-risk surface (the mock exam itself) without the disclaimer. Resolved: §1 #2 enumerates runtime routes explicitly, §6 names the fallback (mount in exam shell), failure-modes row 2, and the e2e runtime-routes test covers it; AC #1.

### ISS-003 - Mark-literal rule would have blocked legitimate question content

Items must name Claude to test it; rule B as first drafted would flag the whole question bank. Resolved: `src/data/**` exemption in §1 #5 with rationale in §2, plus failure-mode row 12 extending the exemption to rule A for quoted vendor-doc text.

### ISS-004 - Hardcoded route list in the e2e test would rot

A static route array in the disclaimer test would miss every future page - exactly the omission the task exists to prevent. Resolved: §5 drives the e2e from the imported `sitemap.ts` output; failure-mode row 1; AC #1.

### ISS-005 - Inline SVG logos evade a filename-based asset scan

Rule C matches filenames; a vendor logo pasted as JSX paths has no filename. Resolved: unit fs scan greps svg/jsx text for vendor names (AC #3), failure-mode row 5 records the residual risk and the reviewer rule.

### ISS-006 - No guard against the guard being removed

`check-brand-terms` could be silently dropped from `precommit` and nothing would notice. Resolved: §1 #5 wires it into precommit and AC #5 adds a unit test that reads `package.json` and asserts the chain; failure-mode row 6.

### ISS-007 - Multi-vendor future would have forced a rewrite

First draft hardcoded Anthropic strings in the component. Resolved: §1 #10 makes the surface data-driven off `VENDOR_MARKS`; AC #10 proves a second entry flows through without component edits.

## §3 - Rubric sweep

- TRACE-001: §1 #1-#10 each cited by ACs 1-10 (clause #1 by ACs 1 and 2; #5 by ACs 2, 4, 5). No orphan clauses; no deferred clauses.
- TRACE-002: every AC names a §5 test or scripted check. TRACE-003: all §5 paths appear in `new_files`.
- QA-004: no numeric targets invented; the only ranges quoted stay in the source doc.
- SAFE-001..004: no untrusted-content blocks needed (no customer quotes); no injection surface.
- Frontmatter: status enum valid, effort_hours populated, depends_on/blocks reciprocal (none), no trailing comments.

## §4 - Resolution

All 7 findings addressed in the shipped spec text. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-LEGAL-001 audit._
