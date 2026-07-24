---
id: task-LEARN-003
title: 'Spaced-repetition review scheduling (FSRS) for items and flashcards'
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
related_tasks: [task-LEARN-002]
depends_on: [task-DATA-001, task-PAY-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D premium features: spaced repetition (SM-2/FSRS, the Anki-family algorithms with strong learning-science backing for long-term retention); flashcards round out the kit'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/srs.ts
  - src/app/review/page.tsx
  - src/app/api/review/route.ts
  - supabase/migrations/20260920000000_review_cards.sql
  - tests/unit/srs.test.ts
  - tests/integration/review.test.ts
modified_files:
  - src/app/flashcards/page.tsx
  - src/app/dashboard/page.tsx
  - src/lib/analytics.ts
effort_hours: 20
subtasks:
  - 'FSRS scheduler as a pure function + reference-vector tests (6h)'
  - 'review_cards schema + card lifecycle (miss->card, flashcard opt-in) (5h)'
  - 'Daily review queue UI + grading flow (6h)'
  - 'Gating, dashboard due-count, analytics, tests (3h)'
risk_if_skipped: "Spaced repetition is the doc's named retention mechanic - both memory retention for the learner and product retention against post-pass churn (a daily due-queue is a daily reason to return). Without it, wrong answers evaporate instead of becoming a review asset, and the flashcards surface stays a static page instead of the premium habit loop."
---

# task-LEARN-003 - Spaced-repetition review scheduling (FSRS)

## §1 - Description

1. `src/lib/srs.ts` MUST implement the FSRS scheduler as a pure function: `schedule(card, grade, now) -> nextCard` over card state `{ stability, difficulty, state, due, lastReview }` and grades `again | hard | good | easy`. The implementation MUST be validated against published FSRS reference vectors (fixture file with source citation) so the algorithm is provably the algorithm, not an approximation. SM-2 is the documented fallback only if FSRS reference validation proves impractical - the decision and reason land in the module doc comment (default: FSRS).
2. A migration MUST add `review_cards`: `user_id`, `card_kind` (`item` | `flashcard`), `card_ref` (item id or flashcard key), `exam_id`, FSRS state fields, `due_at`, `suspended`, timestamps; unique on (user_id, card_kind, card_ref). RLS on, no anon policies (repo pattern); all access via the server layer.
3. Card creation MUST be automatic for wrong answers: when a graded response is incorrect, a review card for that item is upserted (never duplicated) for identified users. Flashcards MUST be enrollable by explicit user action ("add to review") from the flashcards surface. Canary items MUST never become cards.
4. The review experience: `/review` MUST present due cards oldest-due-first, one at a time - items re-render as answerable questions (through the DATA-001 shaping path, no answer leak before grading), flashcards as prompt/reveal - and record the user's grade, rescheduling via `schedule()`. Item-card reviews MUST record `item_responses` rows (they are real practice) with the sitting variant `review`.
5. The daily queue MUST have a config daily cap with overflow carried to the next day (review debt is bounded, not punishing); the dashboard MUST show the due count as the entry point.
6. Review scheduling and `/review` are premium (task-PAY-001 `resolveAccess`); the existing static flashcards page stays free and unchanged in free tier. Enforcement-off renders for all (dark-launch rule). Cards accrue for free users silently (wrong answers still upsert) so a later upgrade has history - accrual is cheap, the premium feature is the scheduler and queue.
7. Suspend/remove MUST exist per card (user control), and passing an exam MUST NOT auto-delete its cards (post-pass retention is a doc theme - multi-cert journeys reuse overlapping knowledge; the user decides).
8. Timezone honesty: due-date rollover MUST use the user's local timezone offset captured client-side at review time, not server UTC midnight, so "today's queue" behaves correctly in Vietnam and everywhere else.
9. Analytics: `review_session_started` (due count), `review_card_graded` (kind + grade only, no card content), `review_session_completed` extend the OBS-001 map.
10. This task MUST NOT modify exam-mode assembly or scoring, MUST NOT add LLM calls, and MUST NOT alter the free flashcards content surface beyond the opt-in affordance.

## §2 - Why this design

**Why FSRS with reference-vector validation (§1 #1)?** The doc names the Anki-family algorithms for their learning-science backing; that backing attaches to the actual algorithm, not to "something interval-ish". Reference vectors make correctness testable and keep marketing claims ("FSRS-scheduled review") true. The SM-2 fallback is documented because FSRS's parameters are more intricate - but the default is the better scheduler.

**Why auto-cards from misses plus opt-in flashcards (§1 #3)?** A wrong answer is the highest-signal review candidate and costs the user zero effort to capture; flashcards are curriculum the user chooses. Auto-enrolling everything would flood the queue and make the cap feel arbitrary; this split keeps the queue meaningful.

**Why accrue cards for free users (§1 #6)?** The upgrade moment ("you have 214 cards waiting, scheduled and ready") is the honest version of a conversion hook: real value, already theirs, unlocked - not manufactured scarcity. Accrual is rows, not compute.

**Why bounded daily queues (§1 #5)?** SRS products die by guilt: a 400-card backlog after a week away makes users quit. Caps with carried overflow keep the habit re-enterable, which is the retention point.

**Why item reviews write item_responses (§1 #4)?** Review answers are evidence of ability; feeding them to the mastery model (LEARN-001) and calibration stream keeps one truth about the user and the items rather than a parallel SRS-only ledger.

## §3 - Contract

```typescript
// src/lib/srs.ts (pure)
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export interface Card { stability: number; difficulty: number; state: CardState;
  due: string; lastReview: string | null }
export function schedule(card: Card, grade: Grade, now: Date): Card;   // FSRS; validated vs reference vectors
export const SRS_CONFIG: { dailyCap: number; requestRetention: number };

// server layer (src/app/api/review/route.ts + lib)
GET  /api/review?exam=<code>&tzOffset=<min>  -> { due: CardView[]; dueCount: number }  // premium
POST /api/review/grade { cardId, grade, tzOffset }  -> { next: CardView | null }
```

```sql
-- 20260920000000_review_cards.sql (shape)
create table review_cards (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users, card_kind text not null check (card_kind in ('item','flashcard')),
  card_ref text not null, exam_id uuid references exams,
  stability numeric not null, difficulty numeric not null,
  state text not null check (state in ('new','learning','review','relearning')),
  due_at timestamptz not null, last_review_at timestamptz, suspended boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, card_kind, card_ref));
-- index (user_id, due_at) where not suspended; RLS on, no anon policies
```

## §4 - Acceptance criteria

1. **FSRS faithful** - `schedule()` reproduces the published reference vectors (fixture cites source); state transitions new->learning->review and lapse->relearning behave per algorithm (traces_to: §1 #1).
2. **Card lifecycle** - Wrong graded answer upserts exactly one card (re-missing does not duplicate); flashcard opt-in creates its card; canary items never create cards (traces_to: §1 #2, #3).
3. **Review flow sound** - Due cards serve oldest-first; item cards render through the shaping path with no pre-grade answer leak; grading reschedules per `schedule()`; item reviews write `item_responses` with variant `review` (traces_to: §1 #4).
4. **Queue bounded** - Due count above the cap serves cap-many today and carries the rest; dashboard shows due count (traces_to: §1 #5).
5. **Gating matrix** - Premium: full queue; free: locked /review with accrued-count teaser, static flashcards unchanged; enforcement off: open to all; free-user misses still accrue cards (traces_to: §1 #6).
6. **User control + post-pass retention** - Suspend/remove work per card; passing fixture exam leaves cards intact (traces_to: §1 #7).
7. **Timezone rollover** - Fixture at UTC+7: cards due "today" locally appear despite server UTC date differing (traces_to: §1 #8).
8. **Events coarse** - Review events carry kind/grade/counts, never card content or item ids (traces_to: §1 #9).
9. **Scope fences** - Exam assembly/scoring fixtures byte-identical; no LLM imports; free flashcards content untouched (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/unit/srs.test.ts (vitest)
test('FSRS reference vectors reproduce (cited fixture)'); // AC 1
test('state machine: new->learning->review; again->relearning'); // AC 1
test('timezone rollover math at UTC+7 fixture'); // AC 7

// tests/integration/review.test.ts (local supabase)
test('miss upserts one card; repeat miss no duplicate; canary never'); // AC 2
test('flashcard opt-in enrolls'); // AC 2
test('queue order, shaping no-leak, grade reschedules, item_responses variant review'); // AC 3
test('daily cap + overflow carry; dashboard due count'); // AC 4
test('gating matrix incl. free accrual + locked teaser'); // AC 5
test('suspend/remove; cards survive exam pass fixture'); // AC 6
test('event payload scan: no card content'); // AC 8
test('assembly/scoring fixtures byte-identical; grep no LLM'); // AC 9
```

## §6 - Implementation skeleton

srs.ts pure scheduler + reference fixtures first (the algorithm is the risk) -> migration -> card lifecycle hooks in the grade path (miss upsert) and flashcards page (opt-in) -> review API + /review UI one-card loop -> dashboard due count -> gating + teaser -> analytics -> tests. Keep the scheduler free of Date.now() (now injected) for determinism.

## §7 - Dependencies

- Upstream: task-DATA-001 (users, items, responses, shaping path) and task-PAY-001 (gating) - hard.
- Downstream: none in wave; LEARN-002 interplay (avoid drilling items due for review the same day) is the flagged joint decision in both specs' §9.
- Related: task-LEARN-001 benefits from review-generated responses in mastery.

## §8 - Example payloads

```json
// GET /api/review?exam=ccaf&tzOffset=420
{ "dueCount": 23,
  "due": [ { "cardId": "a7...", "kind": "item", "state": "review",
             "question": { "id": "b1...", "stem": "...", "options": [ ... ] } } ] }
```

```json
// POST /api/review/grade
{ "cardId": "a7...", "grade": "good", "tzOffset": 420 }
```

## §9 - Open questions

Deferred:

- `dailyCap` and `requestRetention` defaults are set at implementation (FSRS's own default retention is the starting point, recorded in the module doc); tuned on cohort behavior.
- Drill/review same-day overlap policy is decided jointly with LEARN-002 when both are live (flagged in both specs).
- Cross-exam card dedup (same knowledge in two certs' items) is future work with the multi-cert journey wave.

## §10 - Failure modes inventory

| Failure                                  | Detection                                                                                | Outcome                      | Recovery                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| Scheduler drifts from FSRS               | Reference-vector AC 1                                                                    | Learning-science claim false | Fixture-locked algorithm         |
| Duplicate cards per repeated miss        | Upsert uniqueness AC 2                                                                   | Queue spam                   | unique(user, kind, ref)          |
| Canary becomes a card                    | AC 2 canary check                                                                        | Decoy studied as real        | Exclusion at creation            |
| Answer leaks in review render            | Shaping-path reuse AC 3                                                                  | Key exposure                 | Single shaping choke point       |
| Backlog guilt spiral after absence       | Cap + carry AC 4                                                                         | Habit abandonment            | Bounded queue design             |
| Server-UTC midnight wrong queue in VN    | Timezone AC 7                                                                            | "Due tomorrow" today         | Client tzOffset in requests      |
| Free accrual surprises users             | Teaser copy shows accrued count honestly; privacy policy covers response storage already | Perceived tracking           | Honest teaser framing            |
| Cards deleted on exam pass               | AC 6 retention test                                                                      | Multi-cert value lost        | User-decides rule                |
| Review responses fork from mastery truth | item_responses variant AC 3                                                              | Two ability ledgers          | One response stream              |
| Suspended cards resurface                | Suspend filter in due query (AC 6)                                                       | User control broken          | where not suspended index        |
| Queue starves newest cards under cap     | Oldest-due-first is deliberate; overflow carries                                         | New-card latency             | Documented ordering; cap tunable |
| Event props leak studied content         | AC 8 scan                                                                                | Analytics shadow deck        | Coarse event rule                |

## §11 - Implementation notes

- Use the published FSRS parameter set and cite the exact source revision in the fixture file header; if upstream revises parameters, the fixture pins ours until a deliberate bump.
- The one-card loop UI should preload the next card's payload during grading to feel instant without batching answers client-side.
- `card_ref` is text (item uuid or flashcard key) by design - flashcards are content keys, not DB rows, until a future flashcard-authoring task.
- Dashboard due-count query must be the cheap indexed count, not a full queue fetch.

_End of task-LEARN-003._
