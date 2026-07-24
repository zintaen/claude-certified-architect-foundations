# backlog-state-update batch - 2026-07-17 wave 3 (/create-tasks AMD-003)

Nine `backlog-state-update@2` mutations, `mutation_kind: insert-row`, batched per /create-tasks
step 3. Backlog: `docs/tasks/BACKLOG.md`, section `## ready_to_implement`. Rows inserted at their
sorted positions (ascending by STEM: GROWTH-_ between task-DATA-002 and task-LEARN-001;
SCALE-_ between task-PAY-002 and task-SEC-001). `line_number`/`old_line` null (inserts);
`expected_absent: true` verified against the pre-image (no row existed for any of the nine ids).

```yaml
generated_at: 2026-07-17
backlog_path: docs/tasks/BACKLOG.md
mutation_kind: insert-row
transition_kind: forward
evidence_artefact_ids:
  task_audit: per-task <STEM>/audit.md (score_post_revision 10/10)
mutations:
  - {
      task_id: task-GROWTH-001,
      slug: task-GROWTH-001-programmatic-seo,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-GROWTH-001-programmatic-seo - Programmatic SEO pages over the exam/item model with indexation rules',
    }
  - {
      task_id: task-GROWTH-002,
      slug: task-GROWTH-002-aeo-geo,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-GROWTH-002-aeo-geo - AEO/GEO: citability in AI assistants and answer engines',
    }
  - {
      task_id: task-GROWTH-003,
      slug: task-GROWTH-003-referral-program,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-GROWTH-003-referral-program - Referral program with entitlement-day rewards',
    }
  - {
      task_id: task-GROWTH-004,
      slug: task-GROWTH-004-community-explanations,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-GROWTH-004-community-explanations - Community explanations with moderation and AUP enforcement',
    }
  - {
      task_id: task-GROWTH-005,
      slug: task-GROWTH-005-lifecycle-email,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-GROWTH-005-lifecycle-email - Lifecycle email: retention sequences and multi-cert nudges',
    }
  - {
      task_id: task-SCALE-001,
      slug: task-SCALE-001-localization-i18n,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SCALE-001-localization-i18n - i18n infrastructure and first locale wave (UI/marketing first)',
    }
  - {
      task_id: task-SCALE-002,
      slug: task-SCALE-002-mobile-pwa,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SCALE-002-mobile-pwa - Mobile PWA: installability and offline practice (web-first doctrine)',
    }
  - {
      task_id: task-SCALE-003,
      slug: task-SCALE-003-b2b-seats,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SCALE-003-b2b-seats - B2B team seats and seat management',
    }
  - {
      task_id: task-SCALE-004,
      slug: task-SCALE-004-ai-cert-vendor-ring2,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-SCALE-004-ai-cert-vendor-ring2 - Second AI-cert vendor ring (AWS/Azure/Google AI certs) with per-vendor legal configs',
    }
```

## Reciprocity patches carried with this batch (frontmatter-only)

- task-CONTENT-003 `blocks` += [task-GROWTH-001, task-SCALE-004]
- task-SEO-001 `blocks` += [task-GROWTH-001]
- task-PAY-001 `blocks` += [task-GROWTH-003, task-GROWTH-005]
- task-OBS-001 `blocks` += [task-GROWTH-003, task-GROWTH-005]
- task-DATA-001 `blocks` += [task-GROWTH-004]
- task-LEGAL-002 `blocks` += [task-GROWTH-004]
- task-DATA-002 `blocks` += [task-SCALE-001, task-SCALE-002]
- task-PAY-002 `blocks` += [task-SCALE-003]
- task-LEGAL-001 `blocks` += [task-SCALE-004]

## Audit (backlog-state-update-audit, backlog_state_update_rubric)

- new_status enum-valid and equal to each task file's frontmatter status at write time (sweep below).
- insert-row only; BSU-INS uniqueness gate clean (pre-image absent, post-image exactly one per id).
- Row grammar regenerator-identical; all nine `class: product` (no improvement suffix); block contiguous and STEM-sorted post-insert.
- Whole-file discipline: only the section block changed.
- Evidence: nine audits at 10/10.

Verdict: **10/10 - PASS.**

memory_emit: `{ row_kind: workflow_phase_complete, tasks: 9, outcome_summary: "/create-tasks wave 3 (AMD-003) landed 9 growth/scale tasks; backlog complete at 27 tasks covering Phases 0-5 of the expansion plan; reciprocity patched on 9 upstream specs." }`

_End of backlog-state-update batch 2026-07-17 wave 3._
