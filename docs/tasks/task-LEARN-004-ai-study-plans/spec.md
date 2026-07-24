---
id: task-LEARN-004
title: 'Personalized study plans, pre-generated at build time'
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
related_tasks: [task-LEARN-002, task-LEARN-003, task-CONTENT-002]
depends_on: [task-LEARN-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D premium features: AI study plans; §F caching/pre-generation: study-plan templates are generated once and stored, not per request'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/studyPlan.ts
  - src/data/plan-templates/README.md
  - src/app/plan/page.tsx
  - src/app/api/plan/route.ts
  - supabase/migrations/20260925000000_study_plans.sql
  - tests/unit/study-plan.test.ts
  - tests/integration/study-plan.test.ts
modified_files:
  - src/app/dashboard/page.tsx
  - src/lib/analytics.ts
effort_hours: 12
subtasks:
  - 'Template library shape + offline authoring run (provenance-logged) (4h)'
  - 'Deterministic plan assembly from templates + weakDomains + timeline (4h)'
  - 'Plan UI, progress tracking, re-plan; gating + tests (4h)'
risk_if_skipped: "Study plans are on the doc's premium list and are the feature that turns 'you are weak in X' into 'here is your week'. Skipping it leaves readiness and drilling as disconnected tools without the narrative that carries a learner from signup to exam date - the arc subscriptions renew against."
---

# task-LEARN-004 - Personalized study plans, pre-generated at build time

## §1 - Description

1. Plan generation MUST follow the doc's cost doctrine: no LLM call in any request path. A template library under `src/data/plan-templates/` is authored offline (batch, frontier model permitted) covering plan phases (diagnose, build, drill, mock, taper) and per-domain study guidance blocks per exam; the authoring run MUST be provenance-logged with the same discipline as content (run manifest, reviewed before merge - templates are content).
2. `src/lib/studyPlan.ts` MUST assemble a personal plan deterministically from: exam date + weekly available hours (user inputs), current `weakDomains` output (task-LEARN-001), and the template library. Assembly is pure math and selection: week-by-week schedule of drill targets, review cadence (LEARN-003's queue when present), mock placements, and taper - the "AI" happened at template-authoring time.
3. Timeline honesty: when the exam date and hours entered cannot reasonably cover the gap (config floor of total hours vs deficit-weighted need), the plan MUST say so plainly and show what a realistic scope looks like, rather than compressing into a fantasy schedule.
4. A migration MUST add `study_plans` (`user_id`, `exam_id`, `inputs` jsonb, `plan` jsonb, `plan_version`, `created_at`, `superseded_at`) - plans are versioned snapshots, never edited in place; re-planning (user request or material readiness drift) writes a new row and supersedes the old.
5. Progress MUST be tracked against the plan from real activity (sittings, drills, reviews - no manual checkboxes for machine-visible work), with the dashboard showing this week's plan slice and completion state. Re-plan MUST be offered when actual progress diverges beyond a config drift threshold.
6. Plans are premium (task-PAY-001 `resolveAccess` on the API and page; locked teaser for free; enforcement-off renders for all).
7. Mock placements in the plan MUST respect the free/premium reality: for premium users mocks are unlimited; the plan MUST NOT schedule what the user's tier cannot execute.
8. Analytics: `plan_created` (weeks, hours/week), `plan_replanned` (drift trigger vs manual), `plan_week_completed` extend the OBS-001 map - no plan content in properties.
9. This task MUST NOT add runtime LLM calls, MUST NOT modify assembly/grading/readiness computation, and template authoring MUST NOT enter this repo unreviewed (same SME-style review gate as content: a named human reads every template before merge).

## §2 - Why this design

**Why templates + deterministic assembly instead of live generation (§1 #1, #2)?** The doc's §F is explicit: study-plan templates are the worked example of "generate once at build time, serve statically". Live plan generation would add marginal cost, latency, and hallucination surface to a feature whose personalization inputs (dates, hours, deficits) are structured data that math composes better than a model does.

**Why timeline honesty (§1 #3)?** A plan that compresses 80 hours of need into a 10-day fantasy discredits the readiness score it came from. Saying "this timeline is tight; here is what fits" is the humble-claims register (LEARN-001 §1 #3) applied to scheduling.

**Why versioned snapshots (§1 #4)?** Plans are commitments the user measures themselves against; editing them in place gaslights ("was week 2 always like this?"). Supersession keeps the history and makes re-planning legible.

**Why activity-derived progress (§1 #5)?** Manual checkboxes rot and lie; sittings, drills, and reviews are already recorded truth. The plan reads the ledger instead of asking the user to maintain a second one.

## §3 - Contract

```typescript
// src/lib/studyPlan.ts (server-only)
export interface PlanInputs {
  examCode: string;
  examDate: string;
  hoursPerWeek: number;
}
export interface PlanWeek {
  index: number;
  theme: string;
  drills: { domainKey: string; sessions: number }[];
  reviewCadence: 'daily' | 'alternate';
  mock: boolean;
  taper: boolean;
}
export interface StudyPlan {
  planVersion: number;
  inputs: PlanInputs;
  feasibility: 'fits' | 'tight' | 'unrealistic';
  weeks: PlanWeek[];
  generatedFrom: { weakDomainsVersion: number; templateSetVersion: string };
}
export function assemblePlan(
  inputs: PlanInputs,
  weak: WeakDomain[],
  templates: TemplateSet
): StudyPlan; // pure
export function progressAgainst(plan: StudyPlan, activity: ActivitySummary): WeekProgress[]; // pure
export const PLAN_CONFIG: { minHoursFloor: number; driftThresholdPct: number };
```

```text
GET/POST /api/plan (premium; read/write rate classes)  create, fetch current, re-plan
/plan page: current week hero, full timeline, feasibility banner; dashboard: week slice widget
Template library: src/data/plan-templates/<exam or generic>/*.json + README with authoring/review procedure
```

## §4 - Acceptance criteria

1. **No runtime LLM** - Grep proves no model SDK import in plan paths; assembly is synchronous pure functions (traces_to: §1 #1, #9).
2. **Deterministic assembly** - Same inputs + weak-domain fixture + template set = identical plan; deficit-heavy domains receive proportionally more drill sessions; taper and mock placement follow template phase rules (hand-checked fixture) (traces_to: §1 #2).
3. **Feasibility honesty** - Fixture with hours far below deficit-weighted need yields `unrealistic` with the plain-language banner and a fits-scope alternative; adequate fixture yields `fits` (traces_to: §1 #3).
4. **Versioned snapshots** - Re-plan writes a new row, supersedes the old, never mutates; history retrievable (traces_to: §1 #4).
5. **Activity-derived progress** - Fixture activity (drill sittings, reviews) marks plan weeks complete without manual input; divergence beyond threshold surfaces the re-plan offer (traces_to: §1 #5).
6. **Gating matrix** - Premium full feature; free locked teaser; enforcement-off open (traces_to: §1 #6).
7. **Tier-consistent scheduling** - Plans never schedule actions the tier cannot perform (fixture: free-tier plan request is gated anyway; premium plans schedule mocks freely) (traces_to: §1 #7).
8. **Events coarse** - Plan events carry weeks/hours/trigger, no plan content (traces_to: §1 #8).
9. **Templates reviewed** - Every template file carries a review header (reviewer, date); a unit test enforces the header's presence; README documents the authoring + review procedure (traces_to: §1 #1, #9).

## §5 - Verification

```typescript
// tests/unit/study-plan.test.ts (vitest)
test('assembly determinism + deficit-proportional drills + phase rules'); // AC 2
test('feasibility: unrealistic banner fixture + fits fixture'); // AC 3
test('progressAgainst marks weeks from activity; drift triggers offer'); // AC 5
test('template files carry review headers'); // AC 9
test('grep: no model SDK in plan paths'); // AC 1

// tests/integration/study-plan.test.ts (local supabase)
test('re-plan supersedes, history intact'); // AC 4
test('gating matrix on/off'); // AC 6
test('tier-consistent scheduling fixtures'); // AC 7
test('event payload scan'); // AC 8
```

## §6 - Implementation skeleton

Template shape + README procedure -> offline authoring run (reviewed, provenance-logged) -> assemblePlan/progressAgainst pure functions -> migration -> API + /plan page + dashboard widget -> gating -> analytics -> tests.

## §7 - Dependencies

- Upstream: task-LEARN-001 (`weakDomains`, hard). Transitive: DATA-001, PAY-001.
- Downstream: none; LEARN-002/003 surfaces are what plans schedule into (soft references - plans degrade gracefully to drill-only cadence if SRS is not yet live).
- External: one offline batch authoring run (budgeted like a CONTENT-002 run).

## §8 - Example payloads

```json
{
  "planVersion": 2,
  "feasibility": "tight",
  "inputs": { "examCode": "ccaf", "examDate": "2026-09-30", "hoursPerWeek": 6 },
  "weeks": [
    {
      "index": 1,
      "theme": "Diagnose + foundations",
      "drills": [{ "domainKey": "agent-architecture", "sessions": 3 }],
      "reviewCadence": "daily",
      "mock": false,
      "taper": false
    }
  ],
  "generatedFrom": { "weakDomainsVersion": 1, "templateSetVersion": "tpl-2026-09" }
}
```

## §9 - Open questions

Deferred:

- `minHoursFloor` and `driftThresholdPct` defaults are set at implementation and recorded in PLAN_CONFIG's doc comment (measured judgment, not spec constants).
- Calendar-export (ICS) and reminder emails are future ergonomics once plans prove used.

## §10 - Failure modes inventory

| Failure                                | Detection                                                             | Outcome                               | Recovery                                |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| Live LLM sneaks into request path      | AC 1 grep                                                             | Marginal cost + hallucinated plans    | Template doctrine                       |
| Fantasy compression of short timelines | Feasibility AC 3                                                      | Credibility loss                      | Honesty banner + fits-scope alternative |
| Plan mutated under the user            | Snapshot rule AC 4                                                    | Trust damage                          | Versioned supersession                  |
| Manual progress rot                    | Activity-derived AC 5                                                 | Dead feature                          | Ledger-driven progress                  |
| Unreviewed template content merged     | Review-header test AC 9                                               | Content-quality hole outside pipeline | Same human-gate as content              |
| Plans schedule gated actions           | AC 7                                                                  | Broken plan steps                     | Tier-consistency rule                   |
| Drift never triggers re-plan           | AC 5 divergence fixture                                               | Stale plan shame                      | Config threshold                        |
| Template set version untracked         | generatedFrom field                                                   | Irreproducible plans                  | Version stamped per plan                |
| Deficit inputs stale at assembly       | weakDomains computed at create/re-plan time; staleness metadata shown | Misaimed weeks                        | Re-plan offer on drift                  |
| Premium leak via plan API              | AC 6                                                                  | Free access                           | resolveAccess in route                  |
| Event props leak plan content          | AC 8 scan                                                             | Analytics oversharing                 | Coarse rule                             |
| SRS absent at plan time                | Graceful degrade (drill-only cadence) noted in §7                     | Broken reference                      | Conditional cadence block               |

## §11 - Implementation notes

- Keep templates exam-generic where possible (phase structure) with per-exam domain guidance blocks - the library should grow sublinearly with the catalog.
- Feasibility math: deficit-weighted need derives from the same `weakDomains` deficits; document the formula in the README beside the templates so the honesty banner is explainable.
- The dashboard widget shows "this week" only - the full timeline lives on /plan; resist cramming.

_End of task-LEARN-004._
