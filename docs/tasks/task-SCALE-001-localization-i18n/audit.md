---
task_id: task-SCALE-001
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

Spec is 10 §1 clauses, 10 ACs, 12 failure modes, 10 named tests. The doc's UI-first localization rule is enforced (items stay English, labeled), the SEO-001 contract survives by construction (root untouched, subpath additive, hreflang cluster), and translation inherits the content discipline (batch generation, human review header, legal-string flags). TRACE families clean. Reciprocity: DATA-002's `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Retrofit threatened the frozen URL contract

Draft moved English under /en/ "for symmetry" - reopening the exact migration risk Phase 1 closed. Resolved: §1 #2 root-stays rule with byte-identity AC 3.

### ISS-002 - Item content in scope

Draft translated question stems in the same pass, ignoring the doc's UI-first rule and the quality bar item translation demands. Resolved: §1 #1/#10 explicit exclusion with honest labeling; fence AC 10.

### ISS-003 - Machine-translated legal pages

Terms/privacy in unreviewed machine translation is liability generation. Resolved: §1 #4 per-locale legal policy with English+notice fallback; AC 5.

### ISS-004 - Geo-IP auto-redirect

Draft redirected by IP country - coercive UX and cloaking-adjacent for crawlers. Resolved: §1 #6 dismissible suggestion banner only; AC 7.

### ISS-005 - Big-bang six locales

Shipping the doc's whole ladder at once multiplies unreviewed catalog debt before the pipeline works. Resolved: §1 #3 one-locale proof with the ladder as documented expansion order; AC 4.

### ISS-006 - Catalog/source drift

Nothing tied a translated catalog to the en.json version it translated. Resolved: review header carries source_hash; mismatch fails AC 4; failure-mode row 7.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#10 all cited (#1 ACs 1, 2; #2 AC 3; #3 AC 4; #4 ACs 4, 5; #5 AC 6; #6 AC 7; #7 AC 8; #8 ACs 3, 9; #9 AC 9; #10 AC 10).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: no invented values; locale choice deferred with a recommended default.
- SAFE: no untrusted content.
- Frontmatter: depends_on [DATA-002] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SCALE-001 audit._
