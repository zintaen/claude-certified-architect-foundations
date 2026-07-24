# backlog-state-update batch - 2026-07-16 wave 2 (/create-tasks AMD-002)

Six `backlog-state-update@2` mutations, `mutation_kind: insert-row`, batched per /create-tasks
step 3. Backlog: `docs/tasks/BACKLOG.md`, section `## ready_to_implement`. Rows inserted at
their sorted positions within the existing contiguous block (ascending by task STEM:
task-AI-001 before task-CONTENT-001; task-LEARN-001..005 between task-DATA-002 and
task-LEGAL-001). For inserts, `line_number`/`old_line` are null; `expected_absent: true`
verified against the pre-image (no row for any of the six task ids existed).

```yaml
generated_at: 2026-07-16
backlog_path: docs/tasks/BACKLOG.md
mutation_kind: insert-row
transition_kind: forward
evidence_artefact_ids:
  task_audit: per-task <STEM>/audit.md (score_post_revision 10/10)
mutations:
  - {
      task_id: task-AI-001,
      slug: task-AI-001-tutor-cost-capped,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-AI-001-tutor-cost-capped - Live AI tutor with hard per-user cost caps',
    }
  - {
      task_id: task-LEARN-001,
      slug: task-LEARN-001-readiness-score-analytics,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEARN-001-readiness-score-analytics - Exam-readiness score and premium performance analytics',
    }
  - {
      task_id: task-LEARN-002,
      slug: task-LEARN-002-adaptive-drilling,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEARN-002-adaptive-drilling - Adaptive weak-area drilling over calibrated items',
    }
  - {
      task_id: task-LEARN-003,
      slug: task-LEARN-003-spaced-repetition,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEARN-003-spaced-repetition - Spaced-repetition review scheduling (FSRS) for items and flashcards',
    }
  - {
      task_id: task-LEARN-004,
      slug: task-LEARN-004-ai-study-plans,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEARN-004-ai-study-plans - Personalized study plans, pre-generated at build time',
    }
  - {
      task_id: task-LEARN-005,
      slug: task-LEARN-005-custom-exams,
      class: product,
      status: ready_to_implement,
      expected_absent: true,
      new_line: '- [ready_to_implement] task-LEARN-005-custom-exams - Custom practice exam builder',
    }
```

## Reciprocity patches carried with this batch (frontmatter-only edits to wave-1 specs)

- task-DATA-001 `blocks` += [task-LEARN-001, task-LEARN-003, task-LEARN-005]
- task-PAY-001 `blocks` += [task-LEARN-001, task-LEARN-003, task-LEARN-005, task-AI-001]
- task-CONTENT-002 `blocks` += [task-LEARN-002, task-AI-001]

Metadata-only (no §1-§11 content changes); manifest artefact hashes refreshed for the three files.

## Audit (backlog-state-update-audit, backlog_state_update_rubric)

- new_status in the 10-value enum for all six rows; equals each task file's frontmatter status at write time (sweep below).
- mutation_kind `insert-row` only; no cell moves, reorders, or deletions of existing rows.
- BSU-INS uniqueness gate: pre-image had no row for any of the six ids; post-image carries exactly one each.
- Row grammar regenerator-identical; all six are `class: product` (no improvement suffix); block remains contiguous and STEM-sorted after insertion (verified by sweep).
- Whole-file discipline: only the `## ready_to_implement` block changed.
- Evidence: each task's audit.md exists at 10/10.

Verdict: **10/10 - PASS.**

memory_emit: `{ row_kind: workflow_phase_complete, tasks: 6, outcome_summary: "/create-tasks wave 2 (AMD-002) landed 6 premium-feature tasks at ready_to_implement (LEARN-001..005, AI-001); backlog now indexes 18 tasks; reciprocity patched on 3 wave-1 specs." }`

_End of backlog-state-update batch 2026-07-16 wave 2._
