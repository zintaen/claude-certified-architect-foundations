---
id: task-LEARN-002
title: 'Adaptive weak-area drilling over calibrated items'
module: LEARN
class: product
priority: MUST
status: done
verify: T
phase: P3
milestone: 'P3 · slice 3'
slice: 3
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEARN-003]
depends_on: [task-LEARN-001, task-CONTENT-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D premium features: personalized weak-area drilling, adaptive testing (CAT); lifecycle: monitor exposure'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/adaptive.ts
  - tests/unit/adaptive.test.ts
  - tests/integration/adaptive.test.ts
modified_files:
  - src/lib/sittings.ts
  - src/app/practice/page.tsx
  - src/lib/analytics.ts
effort_hours: 16
subtasks:
  - 'Selection policy: weakness x difficulty proximity x exposure control (7h)'
  - 'Assembly integration as a practice mode + UI entry (5h)'
  - 'Determinism seams, fixtures, integration tests (4h)'
risk_if_skipped: "Weak-area drilling is the second item on the doc's list of what premium buyers actually pay for, and the natural next click after LEARN-001 shows a weak domain. Without it the readiness panel diagnoses and then shrugs; with it the product closes the loop that drives both outcomes (pass rates) and renewal (visible progress)."
---

# task-LEARN-002 - Adaptive weak-area drilling over calibrated items

## §1 - Description

1. `src/lib/adaptive.ts` MUST implement a server-side selection policy for a new practice mode `drill`: given a user and exam, produce an item set weighted by (a) domain deficit from `weakDomains` (task-LEARN-001), (b) difficulty proximity - preferring items whose `item_stats` p-value (task-CONTENT-002) sits near the user's domain mastery so drilling is productive, not demoralizing, and (c) exposure control - items the user answered recently are down-weighted by a config cooldown, and per-item global exposure is capped per the doc's lifecycle rule.
2. Items without calibration stats MUST still be selectable via a documented fallback weight (uncalibrated items get neutral difficulty) so drilling works for young exams; the policy MUST NOT filter to calibrated-only (that would starve new exams and bias exposure).
3. Selection MUST run through `assembleSitting` (task-DATA-001) as `mode: 'practice'` with a `variant: 'drill'` marker persisted on the sitting: canary/retired exclusion, no-answer-leak shaping, and response capture are inherited, not reimplemented. Drill sittings MUST feed `item_responses` normally (they improve the mastery model) and MUST NOT count against exam-mode mock limits.
4. Drilling is premium (task-PAY-001): mode entry, API, and UI gate through `resolveAccess`; free users see the locked entry point with the drill value proposition; enforcement-off renders for all (dark-launch consistency).
5. The policy MUST be deterministic under an injected seed (test seam): same user state + same seed = same selection. Production uses a random seed per session.
6. The selection MUST be explainable in the UI: each drill session shows "focused on: <domains>" derived from the actual deficit inputs, and per-question domain tags - no black-box framing.
7. Adaptive difficulty MUST adjust within a session at domain granularity (after a run of correct answers in a domain, prefer harder items from it next; after misses, easier) using classical stats only - full IRT-based CAT remains deferred behind CONTENT-002's data-volume trigger, and this spec's policy MUST be structured so an IRT selector can replace the difficulty term without touching assembly or UI.
8. Session length MUST be user-selectable from config presets; drill sessions are untimed and unscored against readiness bands directly (they update mastery through responses, they do not print a score banner).
9. Analytics: `drill_started` (domains targeted, length) and `drill_completed` extend the OBS-001 map with exam_code; no per-question correctness in event properties (that lives in item_responses).
10. This task MUST NOT alter exam-mode assembly, scoring, or the free practice surface, and MUST NOT add any LLM calls.

## §2 - Why this design

**Why weakness x proximity x exposure as the policy (§1 #1)?** Pure weakness-targeting serves the user's hardest items in their worst domain - a demoralization machine. Difficulty proximity (drill at the edge of ability) is the classical-stats version of what CAT does, productive and motivating. Exposure control is the doc's own lifecycle requirement and protects item security (SEC-001's concern) by flattening per-item view counts.

**Why route through assembleSitting (§1 #3)?** Every serving invariant that matters (answer-key shaping, canary exclusion, version pinning, response capture) already lives there with tests. A second assembly path would fork those guarantees exactly where a bug leaks premium content or corrupts the response stream.

**Why deterministic-under-seed (§1 #5)?** "Adaptive" logic that cannot be fixture-tested becomes folklore. The seed seam makes the policy a pure function of (state, seed), so ACs assert real selections, not statistical vibes.

**Why explainability (§1 #6)?** The premium pitch is "it knows what you need" - showing the targeting (your weak domains, right there) converts that from claim to demonstration, and it costs one derived string from inputs the policy already has.

## §3 - Contract

```typescript
// src/lib/adaptive.ts (server-only)
export interface DrillRequest {
  userId: string;
  examCode: string;
  length: number;
  seed?: string;
}
export interface DrillPlan {
  targetDomains: { domainKey: string; deficit: number }[];
  itemIds: string[];
  policyVersion: 1;
}
export function planDrill(req: DrillRequest): Promise<DrillPlan>; // pure given injected state+seed
export function nextDifficultyBias(sessionState: DomainRunState): 'easier' | 'hold' | 'harder'; // §1 #7
export const DRILL_CONFIG: {
  cooldownDays: number;
  exposureCapPerItemPerDay: number;
  lengths: number[];
  uncalibratedNeutralP: number;
};
```

```text
Entry: practice page gains a premium 'Drill my weak areas' mode -> POST /api/exams/[code]/session
with { mode: 'practice', variant: 'drill', length } -> assembleSitting consumes planDrill output.
Sitting rows persist variant for analytics/mastery exclusion rules (custom vs drill vs plain).
```

## §4 - Acceptance criteria

1. **Policy weights verified** - Seeded fixtures: higher-deficit domains receive proportionally more items; within a domain, items nearest the user's mastery p-value are preferred; recently-seen items are down-weighted per cooldown (traces_to: §1 #1).
2. **Uncalibrated fallback** - A fixture exam with no item_stats still yields a valid drill plan using neutral difficulty; mixed fixture interleaves both (traces_to: §1 #2).
3. **Assembly inheritance** - Drill sittings exclude canary/retired, leak no answer keys (deep scan), capture item_responses, and do not decrement free mock counts (traces_to: §1 #3).
4. **Premium gate** - Enforcement on: free gets locked entry + API refusal with upgrade payload; premium proceeds; enforcement off: available to all (traces_to: §1 #4).
5. **Determinism** - Same state + seed = identical DrillPlan across runs; different seeds vary selection within policy bounds (traces_to: §1 #5).
6. **Explainability rendered** - Session UI shows targeted domains matching the plan's actual deficit inputs; per-question domain tags present (traces_to: §1 #6).
7. **In-session adaptation** - Fixture run of consecutive corrects in a domain biases next selections harder, misses bias easier; the difficulty term is isolated behind `nextDifficultyBias` (swap seam asserted by a stub IRT implementation compiling against it) (traces_to: §1 #7).
8. **Lengths + unscored** - Only config lengths offered; drill completion shows domain progress, never a readiness band banner (traces_to: §1 #8).
9. **Events shaped** - drill_started/completed carry exam_code + domains + length, no per-question correctness (traces_to: §1 #9).
10. **Scope fences** - Exam-mode assembly and free practice byte-identical (recorded fixture comparison); no LLM SDK imports (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/unit/adaptive.test.ts (vitest)
test('deficit-proportional domain allocation (seeded fixture)'); // AC 1
test('difficulty proximity preference within domain'); // AC 1
test('cooldown down-weights recently seen items'); // AC 1
test('uncalibrated neutral fallback + mixed interleave'); // AC 2
test('determinism: state+seed -> identical plan'); // AC 5
test('nextDifficultyBias: harder/easier transitions; stub IRT selector compiles against seam'); // AC 7
test('config lengths only'); // AC 8

// tests/integration/adaptive.test.ts (local supabase)
test(
  'drill sitting: canary/retired excluded, no key leak, responses captured, mock count untouched'
); // AC 3
test('premium gate on/off matrix'); // AC 4
test('UI: targeted domains + tags match plan inputs'); // AC 6
test('completion shows progress, no band banner'); // AC 8
test('events: exam_code+domains+length, no correctness'); // AC 9
test('exam-mode + free practice fixtures byte-identical; grep no LLM'); // AC 10
```

## §6 - Implementation skeleton

planDrill as pure function over injected state (weakDomains output, item pool with stats, user recent-item list, seed) -> DRILL_CONFIG -> assembleSitting variant wiring -> practice-page mode entry + locked state -> in-session bias hook in the answer flow -> analytics -> tests. The difficulty term lives behind `nextDifficultyBias` so the IRT future is a one-function swap.

## §7 - Dependencies

- Upstream: task-LEARN-001 (`weakDomains`) and task-CONTENT-002 (`item_stats`) - hard; task-DATA-001/PAY-001 transitive through them.
- Downstream: none in this wave; the IRT selector swap arrives with CONTENT-002's trigger.
- Related: task-LEARN-003 (SRS reviews complement drilling; separate surfaces, shared mastery inputs).

## §8 - Example payloads

```json
// DrillPlan (length 12)
{
  "policyVersion": 1,
  "targetDomains": [
    { "domainKey": "agent-architecture", "deficit": 0.31 },
    { "domainKey": "context-management", "deficit": 0.18 }
  ],
  "itemIds": ["b1...", "c9...", "..."]
}
```

## §9 - Open questions

Deferred:

- Config defaults (cooldown days, exposure cap, neutral p, lengths) are set at implementation from the first cohort's usage and recorded in the module doc comment - policy mechanism is normative, tuning values are measured.
- Whether drill plans should avoid items scheduled for SRS review the same day (LEARN-003 interplay) is decided when both ship; flagged to both tasks.

## §10 - Failure modes inventory

| Failure                                         | Detection                                                                                | Outcome                           | Recovery                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------- |
| Drilling serves only brutal items               | Difficulty-proximity AC 1                                                                | Demoralized churn                 | Proximity term in policy              |
| New exam starves (no stats)                     | Uncalibrated fallback AC 2                                                               | Drill unusable where needed most  | Neutral-difficulty fallback           |
| Second assembly path forks serving invariants   | AC 3 inheritance tests                                                                   | Key leak / canary exposure        | assembleSitting-only rule             |
| Drill burns free mock allowance                 | AC 3 mock-count check                                                                    | Support tickets, trust hit        | Variant excluded from limits          |
| Same items repeat session after session         | Cooldown AC 1 + exposure cap                                                             | Stale drilling, item overexposure | Exposure control config               |
| Non-deterministic policy untestable             | Seed seam AC 5                                                                           | Folklore behavior                 | Pure function + seed                  |
| Black-box framing distrust                      | Explainability AC 6                                                                      | "Is it random?" complaints        | Targeting shown from real inputs      |
| In-session adaptation whipsaws                  | Bias function unit fixtures AC 7                                                         | Erratic difficulty feel           | Domain-granular runs, bounded steps   |
| IRT retrofit rewrites the feature               | Seam compile test AC 7                                                                   | Expensive upgrade                 | Difficulty term isolated              |
| Premium leak via session API variant            | AC 4 gate matrix                                                                         | Free users drill                  | resolveAccess in route                |
| Drill responses double-counted oddly in mastery | LEARN-001 includes practice variants by design; sittings carry variant for future tuning | Model skew debate                 | Variant persisted; tunable downstream |
| Event props leak per-question data              | AC 9 scan                                                                                | Shadow gradebook in analytics     | Coarse event rule                     |

## §11 - Implementation notes

- Fetch the user's recent-item list and stats in one query each through the DATA-001 layer; planDrill itself takes plain arrays - keep the DB at the edges.
- Exposure cap is per-item per-day across users (protects the bank), cooldown is per-user (protects the experience) - do not conflate them; both live in DRILL_CONFIG.
- The locked entry point copy follows PAY-001's no-dark-pattern lint list automatically (same component family).

_End of task-LEARN-002._
