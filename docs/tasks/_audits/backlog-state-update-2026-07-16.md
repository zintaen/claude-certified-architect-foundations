# backlog-state-update batch - 2026-07-16 (/create-tasks wave 1)

Twelve `backlog-state-update@2` mutations, `mutation_kind: insert-row`, batched per
/create-tasks step 3. Written by backlog-state-update-author; audited below by
backlog-state-update-audit. Backlog: `docs/tasks/BACKLOG.md`, section `## ready_to_implement`
(this repo's BACKLOG is status-sectioned). Rows sorted ascending by task STEM. For inserts,
`line_number`/`old_line` are null; `expected_absent: true` verified against the pre-image
(section contained only the scaffold placeholder line, which this batch replaces).

```yaml
generated_at: 2026-07-16
backlog_path: docs/tasks/BACKLOG.md
mutation_kind: insert-row
transition_kind: forward # draft -> ready_to_implement recorded in each task's frontmatter by task-audit
evidence_artefact_ids:
  task_audit: per-task <STEM>/audit.md (score_post_revision 10/10, listed below)
mutations:
  - {
      task_id: task-CONTENT-001,
      slug: task-CONTENT-001-item-provenance-log,
      class: improvement,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-CONTENT-001-item-provenance-log - Retroactive provenance documentation for the existing CCAF item bank (improvement)',
    }
  - {
      task_id: task-CONTENT-002,
      slug: task-CONTENT-002-item-generation-pipeline,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-CONTENT-002-item-generation-pipeline - Blueprint-driven AI item pipeline with provenance, similarity gate, SME sign-off, beta fielding',
    }
  - {
      task_id: task-CONTENT-003,
      slug: task-CONTENT-003-claude-cert-catalog,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-CONTENT-003-claude-cert-catalog - Ship all four Anthropic Claude certification exams on the multi-exam platform',
    }
  - {
      task_id: task-DATA-001,
      slug: task-DATA-001-multi-exam-data-model,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-DATA-001-multi-exam-data-model - Multi-vendor multi-exam data model with RLS on Supabase',
    }
  - {
      task_id: task-DATA-002,
      slug: task-DATA-002-user-data-migration,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-DATA-002-user-data-migration - Zero-downtime migration preserving accounts, streaks, history, donations',
    }
  - {
      task_id: task-LEGAL-001,
      slug: task-LEGAL-001-trademark-disclaimers,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEGAL-001-trademark-disclaimers - Trademark disclaimers and independent positioning on every exam surface',
    }
  - {
      task_id: task-LEGAL-002,
      slug: task-LEGAL-002-tos-privacy-compliance,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEGAL-002-tos-privacy-compliance - ToS with honor code and anti-dumps AUP, privacy policy, cookie consent, refund terms',
    }
  - {
      task_id: task-OBS-001,
      slug: task-OBS-001-analytics-email-capture,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-OBS-001-analytics-email-capture - PostHog product analytics baseline and email capture',
    }
  - {
      task_id: task-PAY-001,
      slug: task-PAY-001-entitlements-free-premium,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-PAY-001-entitlements-free-premium - Entitlement model and free/premium feature gating (ships dark)',
    }
  - {
      task_id: task-PAY-002,
      slug: task-PAY-002-mor-checkout-ppp,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-PAY-002-mor-checkout-ppp - Paddle MoR checkout, dual-tier PPP pricing, anti-VPN gating, EU withdrawal compliance',
    }
  - {
      task_id: task-SEC-001,
      slug: task-SEC-001-anti-scraping-baseline,
      class: improvement,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SEC-001-anti-scraping-baseline - Anti-scraping and abuse defenses for the item bank (improvement)',
    }
  - {
      task_id: task-SEO-001,
      slug: task-SEO-001-migration-seo-preservation,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SEO-001-migration-seo-preservation - SEO-preserving cutover: URL contract, 301s, canonicals, rank monitoring',
    }
```

## Audit (backlog-state-update-audit, backlog_state_update_rubric)

- new_status `ready_to_implement` is in the 10-value enum for every row; equals each task file's frontmatter status at write time (verified by sweep below).
- mutation_kind `insert-row` (closed enum); no status-cell moves, reorders, or deletions in the batch.
- BSU-INS uniqueness pre-image gate: no row for any of the 12 task ids pre-existed (section held only the scaffold placeholder); post-image carries exactly one row per task id.
- Row grammar regenerator-identical: `- [<status>] <task-ID-slug> - <title>` with ` (improvement)` suffix on the two `class: improvement` rows; product rows untagged; rows sorted ascending by STEM; contiguous block under the section header.
- Whole-file discipline: only the `## ready_to_implement` section block changes (placeholder line replaced by the 12 rows).
- Evidence cross-reference: each row's task_audit artefact exists at `docs/tasks/<STEM>/audit.md` with `score_post_revision: 10/10`.

Verdict: **10/10 - PASS.**

memory_emit: `{ row_kind: workflow_phase_complete, tasks: 12, outcome_summary: "/create-tasks wave 1 landed 12 tasks (10 product, 2 improvement) at ready_to_implement across P0-P3 from the expansion/monetization plan; backlog index updated in one audited insert-row batch." }`

_End of backlog-state-update batch 2026-07-16._
