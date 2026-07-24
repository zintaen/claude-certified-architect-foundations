---
task_id: task-SCALE-004
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

Spec is 9 §1 clauses, 8 ACs, 12 failure modes, 8 named tests. Correctly framed as the platform-thesis test: vendor expansion as legal research + configs + blueprints + review cycles, with the zero-component integration test proving the waves-1-2 abstraction. The legal-first ordering and the AI-content-policy finding gate carry the doc's CompTIA warning into vendor onboarding as process. TRACE families clean. Reciprocity: CONTENT-003 and LEGAL-001 `blocks` gained this task (patched).

## §2 - Findings (all resolved)

### ISS-001 - Content before legal

Draft ran pipelines first and "checked trademark stuff at launch". Resolved: §1 #1 vendor-guidelines.md authored first with dated live-source verification; AC 1; §2 rationale.

### ISS-002 - AI-content policies assumed permitted

Draft set `ai_generation_policy: permitted` for all three vendors without verification - exactly how a CompTIA-class prohibition gets missed. Resolved: §1 #4 finding-gated configs cross-referencing the research doc; AC 4 re-asserts the CONTENT-002 guard.

### ISS-003 - One shared similarity corpus

Draft reused the Claude corpus for all vendors, leaving AWS/Azure/Google collisions unchecked. Resolved: §1 #6 per-vendor attested corpora; AC 5.

### ISS-004 - Launch coupled to pricing

Draft blocked go-live on prices rows, sacrificing the first-and-free window the doc's playbook depends on. Resolved: §1 #7 decoupling with AC 7 additive-pricing test.

### ISS-005 - Scope creep into cloud foundational certs

Draft included CLF-C02 and AZ-900 "while at it", tripling SME domains mid-task. Resolved: §1 #9 fence; the doc's ring discipline preserved; next wave named in §7.

### ISS-006 - No platform-thesis assertion

Nothing verified that vendor N+1 truly costs zero components - the claim the whole architecture makes. Resolved: §1 #8 zero-component integration test; AC 6; failure-mode row 5.

## §3 - Rubric sweep

- TRACE-001: clauses #1-#9 all cited (#1 AC 1; #2 AC 2; #3 AC 3; #4 AC 4; #5 ACs 5, 6; #6 AC 5; #7 AC 7; #8 AC 6; #9 AC 8).
- TRACE-002/003: all ACs name §5 tests; paths in `new_files`.
- QA-007: item counts and pricing deferred (§9); exam picks sourced from the doc's ring list.
- SAFE: no untrusted content.
- Frontmatter: depends_on [CONTENT-003, LEGAL-001] reciprocal (patched); effort_hours populated.

## §4 - Resolution

All 6 findings addressed in the shipped spec. **Score = 10/10.** Status advances `draft -> ready_to_implement`.

_End of task-SCALE-004 audit._
