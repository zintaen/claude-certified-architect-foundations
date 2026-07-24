---
id: task-AI-001
title: 'Live AI tutor with hard per-user cost caps'
module: AI
class: product
priority: MUST
status: done
verify: T
phase: P3
milestone: 'P3 · slice 4'
slice: 4
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001, task-OBS-001]
depends_on: [task-PAY-001, task-CONTENT-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§F AI provider strategy: live tutor routes to small/cheap models with prompt caching and hard per-user/day token caps; pre-generated answers first; abuse detection'
  - 'Risk register: unbounded AI tutor cost - Medium likelihood, Medium impact'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/tutor.ts
  - src/app/api/tutor/route.ts
  - src/components/TutorPanel.tsx
  - supabase/migrations/20260930000000_tutor_usage_and_cache.sql
  - tests/unit/tutor.test.ts
  - tests/integration/tutor.test.ts
modified_files:
  - src/app/result/page.tsx
  - src/lib/rateLimit.ts
  - src/lib/analytics.ts
  - src/app/privacy/page.tsx
effort_hours: 24
subtasks:
  - 'Provider adapter (cheap model, prompt caching) + kill switch (5h)'
  - 'Serving ladder: pre-generated -> shared cache -> live call (6h)'
  - 'Usage ledger + per-user daily caps + global circuit breaker (6h)'
  - 'Tutor panel UI + injection isolation + privacy row + tests (7h)'
risk_if_skipped: "The tutor is the marquee premium differentiator for an AI-certification brand - and the doc's risk register names it the one feature with unbounded marginal cost. Shipping it without the cap architecture is how a viral day becomes a five-figure API bill; not shipping it at all leaves the 'AI-native prep' positioning as marketing copy."
---

# task-AI-001 - Live AI tutor with hard per-user cost caps

## §1 - Description

1. The tutor's serving ladder MUST be, in order: (1) pre-generated per-option explanations (`items.explanations`, task-CONTENT-002) rendered instantly at zero marginal cost; (2) a shared answer cache - non-personalized tutor answers keyed by (item id, item version, normalized question intent) reused across users; (3) a live call to a configured cheap-model class with prompt caching enabled. Every rung MUST be attempted before the next; the live rung is the exception, not the default.
2. Hard caps MUST bound the live rung at three levels, all config: per-request max output tokens, per-user daily token budget (persisted ledger, not memory), and a global daily spend circuit breaker that disables live calls site-wide when tripped. On any cap hit the tutor MUST degrade gracefully - pre-generated and cached content remain available, with an honest "live tutor back tomorrow" state. Caps failing OPEN is prohibited: ledger or breaker read errors disable the live rung.
3. A migration MUST add `tutor_usage` (`user_id`, `day`, `tokens_in`, `tokens_out`, `requests`, unique(user_id, day)) and `tutor_cache` (`item_id`, `item_version`, `intent_key`, `answer`, `model`, `created_at`, unique(item_id, item_version, intent_key)). RLS on, no anon policies; ledger writes MUST be atomic increments inside the request transaction so parallel requests cannot double-spend a budget.
4. Injection isolation is normative: the tutor context window MUST contain only (a) the served item (stem/options as shown), (b) its pre-generated explanations, (c) the system rubric, and (d) the user's question wrapped as untrusted content. The tutor MUST have no tool access, no browsing, no user-history context, and MUST NOT receive the correct answer key for unanswered questions (pre-grade: study help; post-grade: full rationale). Prompt text MUST instruct refusal of off-topic requests, and the system prompt is versioned in-repo.
5. The tutor MUST be premium (task-PAY-001 `resolveAccess`), available post-answer on practice/drill/review surfaces and post-grade on results - never inside a timed exam-mode sitting in progress (exam integrity: a mock with a tutor open is not a mock).
6. Provider hygiene: the adapter (`src/lib/tutor.ts`) MUST be provider-pluggable, send no PII (no email, no user id beyond an opaque request id; user question text is inherently user content and MUST be disclosed as processed by the AI sub-processor in the privacy page - this task adds that row), honor a `TUTOR_ENABLED=off` kill switch, and never throw into the UI (errors render the degraded state).
7. Cost observability MUST be first-class: OTel counters/gauges for rung served (`ai.tutor_served{rung}`), tokens spent, cap hits (`ai.tutor_capped{level}`), breaker state, and cache hit ratio; the daily spend estimate MUST be queryable from the ledger without provider-console archaeology.
8. Cache integrity: shared-cache answers MUST be generated only from the §1 #4 context (no personalization), reviewed-sampled per an operator cadence documented in the module doc, and invalidated on item version bump. Cache poisoning via user input is structurally prevented: user question text selects an intent key from a closed set (`explain_concept` | `why_wrong` | `walk_through` | `related_concept`), it never becomes cache content.
9. Conversational scenario practice for AI certifications (the doc's differentiator) MAY ship behind the same caps/isolation as an additional intent, and MUST NOT ship without them.
10. Rate limiting: the tutor route joins SEC-001's `write` class with its own tighter sub-budget; abuse heuristics (rapid-fire identical intents, systematic bank walking) trip a per-user cooldown and emit `ai.tutor_abuse_suspected`.
11. Analytics: `tutor_opened`, `tutor_question_asked` (intent key only, never question text), `tutor_capped` extend the OBS-001 map.
12. This task MUST NOT add model calls to any non-tutor path, MUST NOT let tutor output modify items/explanations content, and MUST NOT ship the tutor to free tier (the free tier's AI value is the pre-generated explanations teaser per PAY-001's line).

## §2 - Why this design

**Why the three-rung ladder (§1 #1)?** The doc's cost doctrine is "move expensive AI to build time". Most tutor questions are the same four questions about the same items - pre-generated explanations answer the bulk, the shared cache amortizes the head of the live distribution across users, and the cheap live model serves only the genuine tail. Marginal cost approaches zero as the cache warms, which is what makes a flat premium price survivable.

**Why fail-closed caps with a persisted ledger (§1 #2, #3)?** The risk register entry is "unbounded cost". In-memory counters reset per lambda (the SEC-001 lesson) and fail-open error handling turns a ledger outage into an uncapped day. Atomic DB increments make the budget a fact; the breaker makes the worst case a known number chosen in config.

**Why the closed intent set (§1 #4, #8)?** Free-text-to-cache is a poisoning vector (one user's injected "answer" served to thousands) and free-text-to-prompt is the injection surface. A closed intent set plus untrusted-wrapped user text bounds both: the cache key space is enumerable and the model's instructions never compete with user content on equal footing.

**Why no tutor inside timed mocks (§1 #5)?** The product's credibility rests on the mock meaning something (readiness, leaderboard). Help mid-mock converts the flagship trust artifact into an open-book widget - and the doc's premium framing is tutor-as-coach, not tutor-as-answer-key.

**Why answer-key withholding pre-grade (§1 #4)?** A tutor that reveals the answer before submission is a leak of the exact asset SEC-001 and the shaping path protect. Pre-grade the tutor coaches concepts; post-grade it explains fully - same item, two contexts, enforced by what enters the prompt.

## §3 - Contract

```typescript
// src/lib/tutor.ts (server-only)
export type TutorIntent = 'explain_concept' | 'why_wrong' | 'walk_through' | 'related_concept';
export interface TutorRequest {
  userId: string;
  sittingId: string;
  itemId: string;
  intent: TutorIntent;
  question?: string;
  phase: 'pre_grade' | 'post_grade';
}
export interface TutorAnswer {
  rung: 'pregenerated' | 'cache' | 'live';
  answer: string;
  remainingToday: { tokens: number; requests: number };
}
export function askTutor(
  req: TutorRequest
): Promise<TutorAnswer | { degraded: true; reason: string }>;
export const TUTOR_CONFIG: {
  model: string;
  maxOutputTokens: number;
  userDailyTokens: number;
  userDailyRequests: number;
  globalDailyUsd: number;
  cooldownMinutes: number;
};
// Adapter interface: { complete(prompt, opts): Promise<{text, tokensIn, tokensOut}> } - pluggable, cached
```

```sql
-- 20260930000000_tutor_usage_and_cache.sql (shape)
create table tutor_usage (user_id uuid not null references users, day date not null,
  tokens_in bigint not null default 0, tokens_out bigint not null default 0,
  requests int not null default 0, primary key (user_id, day));
create table tutor_cache (item_id uuid not null, item_version int not null, intent_key text not null,
  answer text not null, model text not null, created_at timestamptz not null default now(),
  primary key (item_id, item_version, intent_key));
-- RLS on, no anon policies; ledger increments atomic in-transaction
```

```text
POST /api/tutor (premium; SEC-001 write class + tutor sub-budget)
Kill switch: TUTOR_ENABLED=off -> degraded state site-wide
Privacy page: AI provider sub-processor row added (question text processed)
OTel: ai.tutor_served{rung}, ai.tutor_capped{level}, ai.tutor_abuse_suspected, cache hit ratio
```

## §4 - Acceptance criteria

1. **Ladder order enforced** - Fixtures prove: explanation-answerable requests never reach cache or live; cache hits never reach live; live fires only on genuine misses (transport mock call counts) (traces_to: §1 #1).
2. **Per-user caps bind** - Exhausting the daily token/request budget yields the degraded state while pre-generated/cached rungs keep serving; budget resets next day; parallel requests cannot overspend (concurrent fixture) (traces_to: §1 #2, #3).
3. **Global breaker + fail-closed** - Tripping the global spend estimate disables live calls site-wide; a simulated ledger read error disables the live rung rather than proceeding (traces_to: §1 #2).
4. **Injection isolation** - Prompt assembly fixture: context contains only item + explanations + rubric + wrapped user text; no answer key pre-grade (deep prompt scan), full rationale post-grade; a hostile question fixture stays inside the untrusted wrapper (traces_to: §1 #4).
5. **Surface rules** - Tutor renders post-answer on practice/drill/review and post-grade on results; absent inside an in-progress timed exam sitting (traces_to: §1 #5).
6. **Provider hygiene** - Transport payload scan: no email/user-id/PII fields; kill switch renders degraded state; provider adapter swap fixture compiles (traces_to: §1 #6).
7. **Cost observability** - Rung counters, cap counters, breaker gauge, and cache hit ratio emit under forced scenarios; ledger query returns the day's spend estimate (traces_to: §1 #7).
8. **Cache integrity** - Cache entries keyed by closed intent set; user question text never persists into cache content (write-path scan); version bump invalidates (traces_to: §1 #8).
9. **Premium + rate limits** - Free-tier calls refused with upgrade payload; tutor sub-budget 429s under hammering; rapid-fire abuse fixture trips cooldown + counter (traces_to: §1 #5, #10).
10. **Events coarse** - Analytics carry intent keys and cap levels, never question text (traces_to: §1 #11).
11. **Scope fences** - Grep: no model SDK outside tutor.ts and the pipeline tools; tutor writes touch only tutor tables; free tier unchanged (traces_to: §1 #12).

## §5 - Verification

```typescript
// tests/unit/tutor.test.ts (vitest, mocked adapter)
test('ladder: pregenerated answers stop the ladder; cache stops live; live only on miss'); // AC 1
test('prompt assembly: allowlisted context, no pre-grade answer key, untrusted wrapping'); // AC 4
test('intent set closed: unknown intent rejected'); // AC 8
test('kill switch + adapter swap fixture'); // AC 6
test('payload scan: no PII fields to provider'); // AC 6

// tests/integration/tutor.test.ts (local supabase, mocked transport)
test('daily budget: exhaust -> degraded; next-day reset; concurrent no-overspend'); // AC 2
test('global breaker trips; ledger error fails closed'); // AC 3
test('surfaces: present post-answer/post-grade, absent mid-mock'); // AC 5
test('cache: closed-key writes, no user text persisted, version-bump invalidation'); // AC 8
test('otel counters/gauges under forced scenarios + ledger spend query'); // AC 7
test('free refusal, sub-budget 429, abuse cooldown fixture'); // AC 9
test('event scan: intents only'); // AC 10
test('grep fences: model SDK confinement, table write confinement'); // AC 11
```

## §6 - Implementation skeleton

Adapter + kill switch -> migration (ledger + cache) -> ladder in askTutor with atomic budget spend -> prompt assembly (allowlist, phase-aware, untrusted wrapping, versioned system prompt in-repo) -> route with gating + rate sub-budget + abuse heuristics -> TutorPanel on the three surfaces -> privacy row + observability -> tests. Build the ladder against the mocked adapter first; the live provider is config on day one.

## §7 - Dependencies

- Upstream: task-PAY-001 (premium gating) and task-CONTENT-002 (`items.explanations` as rung one) - hard. task-SEC-001's limiter classes consumed; task-LEGAL-002's privacy page gains the AI sub-processor row here.
- Downstream: the §1 #9 scenario-practice intent is the AI-cert differentiator follow-up.
- External: cheap-model provider account + keys (operator); config budget numbers are operator pricing decisions recorded in TUTOR_CONFIG at deploy (mechanism normative here, amounts operator-set - QA-007).

## §8 - Example payloads

```json
// POST /api/tutor
{
  "sittingId": "6a4f...",
  "itemId": "b1c2...",
  "intent": "why_wrong",
  "question": "why is B wrong here?",
  "phase": "post_grade"
}
```

```json
// TutorAnswer (cache rung)
{
  "rung": "cache",
  "answer": "Option B assumes the context window persists across...",
  "remainingToday": { "tokens": 8200, "requests": 14 }
}
```

## §9 - Open questions

Deferred:

- Budget amounts (per-user tokens/requests, global USD) are operator pricing/cost decisions set in config at launch and tuned from the observability data this task ships; the doc's doctrine (caps exist, cheap models, caching) is the normative part.
- Model choice within the cheap class is config; revisited as provider pricing moves (the doc's price table is a market snapshot, not a binding).
- The scenario-practice intent (§1 #9) ships when SME review capacity allows authoring its rubric - its own mini-wave.

## §10 - Failure modes inventory

| Failure                               | Detection                                                              | Outcome                         | Recovery                             |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| Viral day = unbounded bill            | Global breaker AC 3 + per-user caps AC 2                               | Bounded worst case              | Config ceilings; degraded state      |
| Ledger outage fails open              | Fail-closed AC 3                                                       | Uncapped spending window        | Live rung disabled on read error     |
| Parallel requests double-spend budget | Concurrent fixture AC 2                                                | Cap bypass                      | Atomic in-transaction increments     |
| Prompt injection via user question    | Untrusted wrapping + hostile fixture AC 4                              | Tutor jailbreak                 | Allowlist context; closed intents    |
| Cache poisoning served to thousands   | Closed-key writes AC 8                                                 | Wrong answers at scale          | User text never enters cache content |
| Answer key leaks pre-grade            | Prompt deep scan AC 4                                                  | Item bank devaluation           | Phase-aware context assembly         |
| Tutor inside timed mocks              | Surface AC 5                                                           | Mock integrity collapse         | In-progress exam exclusion           |
| PII flows to provider                 | Payload scan AC 6                                                      | Privacy breach + disclosure gap | Opaque ids; privacy row added        |
| Provider outage breaks UX             | Adapter never throws (§1 #6)                                           | Degraded state only             | Ladder rungs 1-2 unaffected          |
| Bank walking via tutor                | Abuse heuristics AC 9                                                  | Systematic extraction           | Cooldown + counter + SEC-001 limits  |
| Stale cache after item revision       | Version-key invalidation AC 8                                          | Rationale mismatch              | (item_id, version) key               |
| Cheap model gives wrong explanation   | Sampled review cadence (§1 #8); user flag channel exists (BugReporter) | Quality erosion                 | Cache sampling + flag-driven purge   |
| Kill switch forgotten in incident     | TUTOR_ENABLED documented in launch/runbook notes                       | Slow response                   | Single env switch AC 6               |
| Free-tier exposure                    | AC 9 refusal                                                           | Cost + line erosion             | resolveAccess gate                   |

## §11 - Implementation notes

- Normalize the intent + item into the cache key server-side; the user's free-text question personalizes the live prompt but never the cache key or content - the four intents cover the reuse space.
- Estimate the global breaker's spend from the ledger's token sums times config unit prices - good enough for a circuit breaker; exact billing reconciliation is the provider console's job.
- The system prompt file is versioned in-repo (prompts are code); note its path in the module header and bump a version constant on change so cache entries can be swept on rubric changes if needed.
- Post-grade "why_wrong" should seed from the pre-generated explanation and only go live for follow-ups - that ordering is what makes rung one absorb most volume.

_End of task-AI-001._
