---
id: task-LEARN-005
title: 'Custom practice exam builder'
module: LEARN
class: product
priority: SHOULD
status: done
verify: T
phase: P3
milestone: 'P3 · slice 4'
slice: 4
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEARN-002]
depends_on: [task-DATA-001, task-PAY-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§C premium line: unlimited attempts, custom exams, flashcards, study plans'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/customExam.ts
  - src/components/CustomExamBuilder.tsx
  - tests/unit/custom-exam.test.ts
  - tests/integration/custom-exam.test.ts
modified_files:
  - src/lib/sittings.ts
  - src/app/practice/page.tsx
  - src/lib/analytics.ts
effort_hours: 10
subtasks:
  - 'Constraint model + validation over assembleSitting (4h)'
  - 'Builder UI (domains, count, timing, difficulty band) (4h)'
  - 'Gating, analytics, tests (2h)'
risk_if_skipped: "Custom exams are on the doc's premium line and are the cheapest of the wave to build - a constraint layer over assembly that already exists. Skipping it leaves a visible gap against Tutorials Dojo/Whizlabs feature tables (both offer custom sets) for a feature costing days, weakening the premium bundle's perceived completeness."
---

# task-LEARN-005 - Custom practice exam builder

## §1 - Description

1. `src/lib/customExam.ts` MUST define a validated constraint model for custom sittings: domain selection (one or more of the exam's domains), question count (config-bounded presets), timing (`timed` with a computed budget or `untimed`), and an optional difficulty band (`easier` | `mixed` | `harder`) applied only where `item_stats` exist (task-CONTENT-002), degrading to `mixed` with a visible note otherwise.
2. Custom sittings MUST run through `assembleSitting` (task-DATA-001) as `mode: 'practice'`, `variant: 'custom'` with the constraint set persisted on the sitting - canary/retired exclusion, answer-key shaping, version pinning, and response capture inherited, never reimplemented.
3. Constraint satisfaction MUST be honest: when the selected domains cannot fill the requested count (small domain, young exam), the builder MUST show what is available and offer the reduced set - padding from unselected domains is prohibited.
4. Custom sittings MUST NOT touch exam-mode semantics: they never consume the free mock allowance, never write to the leaderboard, and are excluded from the readiness mastery inputs only if LEARN-001's exclusion list says so (current rule: custom variant excluded per LEARN-001 §1 #1 - this spec conforms, not decides).
5. The builder is premium (task-PAY-001 `resolveAccess` gates the UI entry and the session API variant); free users see the locked entry; enforcement-off renders for all.
6. Grading and review of a custom sitting MUST reuse the standard result surfaces (breakdown by domain works unchanged); explanations visibility follows the user's tier exactly as elsewhere.
7. Recent custom configurations MUST be re-runnable ("run again") from the practice page - stored client-side or per-user, one-click regeneration with fresh item selection under the same constraints.
8. Analytics: `custom_exam_built` (domains count, question count, timing, band) extends the OBS-001 map; no per-question data.
9. This task MUST NOT add LLM calls, MUST NOT alter exam-mode assembly/scoring, and MUST NOT introduce a second serving path.

## §2 - Why this design

**Why a constraint layer, not a new engine (§1 #2)?** Everything hard about serving (leak prevention, canary handling, capture) is solved and tested in `assembleSitting`. Custom exams are a filter expression over the same pool; treating them as such keeps the feature at 10 hours instead of 40 and inherits every future serving fix for free.

**Why honest under-fill (§1 #3)?** Padding a "Networking only, 60 questions" request with off-domain items silently breaks the user's intent and their interpretation of the score. Showing "42 available - run with 42?" preserves trust and costs one dialog.

**Why conform to LEARN-001's exclusion rule rather than restate it (§1 #4)?** Mastery-input policy belongs to the mastery model's spec. Restating it here would create two normative homes that drift; this spec cites and conforms.

## §3 - Contract

```typescript
// src/lib/customExam.ts (server-only validation; builder UI mirrors it)
export interface CustomExamSpec {
  examCode: string;
  domainKeys: string[];
  count: number; // from CUSTOM_CONFIG.counts presets
  timing: 'timed' | 'untimed';
  band: 'easier' | 'mixed' | 'harder';
}
export interface Availability {
  requested: number;
  available: number;
  perDomain: Record<string, number>;
}
export function validateSpec(spec: CustomExamSpec): ValidationResult; // bounds, domains exist, presets
export function checkAvailability(spec: CustomExamSpec): Promise<Availability>; // §1 #3
export const CUSTOM_CONFIG: { counts: number[]; timedSecondsPerQuestion: number };
```

```text
POST /api/exams/[code]/session { mode:'practice', variant:'custom', spec: CustomExamSpec }
  -> assembleSitting with constraint filter; spec persisted on sitting row
Practice page: premium 'Build custom exam' entry -> <CustomExamBuilder/>; recent configs re-run list
```

## §4 - Acceptance criteria

1. **Constraints validated** - Out-of-preset counts, unknown domains, and empty domain sets are rejected server-side; valid specs pass (traces_to: §1 #1).
2. **Band degrades honestly** - Band on a stats-less fixture exam resolves to `mixed` with the visible note; with stats, band filters by p-value tercile (traces_to: §1 #1).
3. **Assembly inheritance** - Custom sittings exclude canary/retired, leak no keys (deep scan), capture responses, persist the spec (traces_to: §1 #2).
4. **Under-fill honest** - Requesting more than available yields the availability dialog and a reduced-set run; no off-domain padding appears in the served set (traces_to: §1 #3).
5. **Exam-mode isolation** - Custom runs never decrement free mocks, never write leaderboard rows; readiness exclusion conforms to LEARN-001 (fixture proves custom responses absent from mastery) (traces_to: §1 #4).
6. **Gating matrix** - Premium builds; free sees locked entry + API refusal; enforcement-off open (traces_to: §1 #5).
7. **Standard result surface** - Custom sitting grades through the normal result page with domain breakdown; explanations follow tier (traces_to: §1 #6).
8. **Re-run works** - A stored recent config regenerates a fresh sitting under identical constraints with different item selection (seeded test shows constraint-equal, selection-fresh) (traces_to: §1 #7).
9. **Events + fences** - custom_exam_built carries the coarse shape only; grep shows no LLM imports and no second serving path; exam-mode fixtures byte-identical (traces_to: §1 #8, #9).

## §5 - Verification

```typescript
// tests/unit/custom-exam.test.ts (vitest)
test('validateSpec: presets, domains, empty-set rejection'); // AC 1
test('band tercile mapping with stats; mixed degrade without'); // AC 2
test('availability math per domain'); // AC 4

// tests/integration/custom-exam.test.ts (local supabase)
test('inheritance: canary/retired excluded, no leak, responses + spec persisted'); // AC 3
test('under-fill dialog path serves reduced set, zero off-domain items'); // AC 4
test('no mock decrement, no leaderboard row, mastery exclusion conforms'); // AC 5
test('gating matrix on/off'); // AC 6
test('result page renders custom sitting with tiered explanations'); // AC 7
test('re-run: constraint-equal, selection-fresh (seeded)'); // AC 8
test('event scan + grep fences + exam-mode byte-identity'); // AC 9
```

## §6 - Implementation skeleton

Constraint model + validation -> availability query through the DATA-001 layer -> assembleSitting filter hook (variant custom) -> builder UI + under-fill dialog -> recent-configs re-run -> gating + analytics -> tests.

## §7 - Dependencies

- Upstream: task-DATA-001 (assembly, item pool) and task-PAY-001 (gating) - hard. `item_stats` from task-CONTENT-002 is a soft enhancer (band feature degrades without it).
- Downstream: none.
- Related: task-LEARN-002 (drill is system-driven selection; custom is user-driven - the two entries sit side by side on the practice page).

## §8 - Example payloads

```json
// POST session (custom)
{
  "mode": "practice",
  "variant": "custom",
  "spec": {
    "examCode": "ccaf",
    "domainKeys": ["agent-architecture", "safety"],
    "count": 25,
    "timing": "timed",
    "band": "harder"
  }
}
```

## §9 - Open questions

Deferred:

- Count presets and seconds-per-question default are set at implementation in CUSTOM_CONFIG (mirroring the real exam's pace as the anchor); recorded in the module doc comment.
- Saved named presets ("my Friday set") beyond the recent list is future ergonomics if usage shows demand.

## §10 - Failure modes inventory

| Failure                                    | Detection                                                  | Outcome                  | Recovery                          |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------ | --------------------------------- |
| Second serving path forks invariants       | AC 3 inheritance + AC 9 grep                               | Leak/capture regressions | assembleSitting-only rule         |
| Off-domain padding on under-fill           | AC 4 zero-padding assertion                                | Silent intent violation  | Honest reduced-set dialog         |
| Custom runs burn free mocks                | AC 5                                                       | Support tickets          | Variant exemption                 |
| Custom scores pollute leaderboard          | AC 5                                                       | Ranking integrity loss   | Exam-mode-only leaderboard writes |
| Mastery skew from self-selected easy sets  | LEARN-001 exclusion conformance AC 5                       | Readiness inflation      | Exclusion rule upstream           |
| Band promised without stats                | Degrade-with-note AC 2                                     | Fake difficulty claims   | Visible mixed fallback            |
| Spec injection via API (arbitrary filters) | Server-side validateSpec AC 1                              | Pool probing             | Closed constraint model           |
| Builder drifts from server validation      | UI mirrors validateSpec; integration AC 1 covers API truth | Confusing rejections     | Single validation source          |
| Re-run replays identical items             | Seeded freshness AC 8                                      | Memorization loop        | Fresh selection under constraints |
| Tiny domains always under-fill             | Availability shown up front (AC 4)                         | Frustration              | perDomain counts in builder       |
| Premium leak via variant param             | AC 6 API refusal                                           | Free custom exams        | resolveAccess on variant          |
| Event over-collection                      | AC 9 scan                                                  | Analytics creep          | Coarse shape rule                 |

## §11 - Implementation notes

- The difficulty band maps to p-value terciles computed over the exam's calibrated items at query time - no stored tercile table to go stale.
- Persist the spec on the sitting row (jsonb) - it is what makes "run again", support questions, and future preset features free.
- Keep the builder to one screen; every extra option is a conversion tax on the common case (pick domains, pick count, go).

_End of task-LEARN-005._
