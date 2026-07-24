---
task_id: task-GROWTH-004
audited: 2026-07-17
auditor: task-audit (audit_rubric@2.0, engineering-spec@1 family)
verdict: PASS (after revision)
score_pre_revision: 5/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
provenance:
  source_path: docs/tasks/_sources/expansion-monetization-plan.md
  source_hash: 2a0eb6125eac1698a54276be7141ca9380288ef61734a5f3dc1ab9771d3b8d59
---

## §1 - Verdict summary

Spec is 9 §1 clauses, 8 ACs, 12 failure modes, 9 named tests. The load-bearing design is the contamination firewall: UGC is the one channel through which recalled real-exam content can enter the site, and the spec makes that pathway structurally impossible (no UGC in items/prompts/pipeline) plus procedurally handled (moderation screen, AUP rejection, item disposition flag). Free-tier display honors the doc's freemium line. TRACE families clean. Reciprocity: DATA-001 and LEGAL-002 `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Publish-then-moderate

Draft displayed submissions immediately with post-hoc review - publishing unreviewed, potentially NDA-violating content under the site's name. Resolved: §1 #4 nothing-publishes-unmoderated; AC 3.

### ISS-002 - No contamination pathway handling

Draft treated UGC as a spam problem only, missing that "on the actual exam..." submissions are the CompTIA-warned contamination vector arriving via users. Resolved: §1 #4 contamination screen with AUP citation and CONTENT-001 disposition flagging; AC 4; failure-mode row 1.

### ISS-003 - UGC reachable by prompts and pipeline

Nothing prevented a future tutor or pipeline change from ingesting community text. Resolved: §1 #3 absolute firewall with grep/import AC 2; the tutor's allowlist (AI-001) and the pipeline's allowlist (CONTENT-002) are corroborating fences.

### ISS-004 - Open submission

Drive-by submissions on unanswered items invited spam and SEO droppers. Resolved: §1 #2 answered-item gate + one-pending + length + rate limits; AC 1.

### ISS-005 - Community gated premium

Draft bundled community explanations into the premium tier, contradicting the doc's explicit free-line placement. Resolved: §1 #5 free display tested (AC 5); fence AC 8.

### ISS-006 - Auto-approve classifier

Draft auto-approved "low-risk" submissions via a model - the system deciding what legal risk to publish. Resolved: §1 #9 human-only moderation with the script path; fence AC 8.

### ISS-007 - XSS surface

Rendered bodies without a sanitization contract. Resolved: §1 #3 safe-subset rendering with XSS fixture AC 2 (isomorphic-dompurify already in the repo's dependency set).

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 AC 1; #2 AC 1; #3 AC 2; #4 ACs 3, 4; #5 ACs 5, 6; #6 ACs 6, 8; #7 AC 7; #8 AC 7; #9 AC 8).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: config values deferred (§9).
- SAFE-001..004: the spec's subject matter IS untrusted-content handling; submission bodies are never quoted in the spec itself.
- Frontmatter: depends_on [DATA-001, LEGAL-002] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 7 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-GROWTH-004 audit._
