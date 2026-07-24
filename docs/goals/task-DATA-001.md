---
source: task-DATA-001
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-DATA-001 multi-exam data model

## predicates

- migrations apply on fresh stack; tables + indexes present
- RLS enabled everywhere; anon read/write denied per table
- prices: negative amount_minor rejected; money columns are bigint
- seed: counts match, provenance required, idempotent second run
- session payload has no correct_key/explanations (deep key scan)
- grade uses persisted question_set across item version bump
- item_responses rows written per graded question
- exam-mode assembly: scored+beta only, canary/retired excluded, beta unscored
- grep: new tables accessed only via catalog.ts/sittings.ts
- rate-limit classify covers new routes

## notes

Re-verify with local Supabase up + `npm test`.
