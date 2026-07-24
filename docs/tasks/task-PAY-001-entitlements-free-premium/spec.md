---
id: task-PAY-001
title: 'Entitlement model and free/premium feature gating (ships dark)'
module: PAY
class: product
priority: MUST
status: done
verify: T
phase: P3
milestone: 'P3 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEGAL-002, task-OBS-001]
depends_on: [task-DATA-001]
blocks:
  [
    task-PAY-002,
    task-LEARN-001,
    task-LEARN-003,
    task-LEARN-005,
    task-AI-001,
    task-GROWTH-003,
    task-GROWTH-005,
  ]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Free/paid line - generous free core (capped Qs + 1 mock) / paid power features; per-exam pass as hero SKU + all-access + lifetime'
  - '§C: exam prep converts on one-time/per-exam passes and lifetime, not pure monthly; premium = full bank, per-option AI explanations, analytics, unlimited attempts'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/skus.ts
  - src/lib/entitlements.ts
  - src/app/api/entitlements/route.ts
  - src/components/UpgradePrompt.tsx
  - scripts/grant-entitlement.mjs
  - supabase/migrations/20260910000000_entitlement_events.sql
  - tests/unit/entitlements.test.ts
  - tests/integration/gating.test.ts
modified_files:
  - src/lib/sittings.ts
  - src/app/api/exam/grade/route.ts
  - src/app/api/exams/[code]/session/route.ts
effort_hours: 16
subtasks:
  - 'SKU registry + entitlement resolution + events table (5h)'
  - 'Server-side gating hooks in assembly/grading/explanations (5h)'
  - 'Entitlement API + upgrade-prompt states + manual-grant script (4h)'
  - 'Unit + integration tests, dark-launch flag verification (2h)'
risk_if_skipped: "PAY-002 cannot sell what the platform cannot grant and enforce. Bolting entitlement checks into serving paths at checkout-launch time would rush the highest-risk change (touching exam assembly and grading) exactly when payment webhooks land. The doc's conversion architecture - per-exam pass hero SKU, generous free core, premium power features - only works if the free/premium line is a tested server-side primitive before money moves."
---

# task-PAY-001 - Entitlement model and free/premium feature gating (ships dark)

## §1 - Description

1. `src/lib/skus.ts` MUST define the stable SKU registry per the doc's pricing structure: `per_exam_pass` (exam-scoped, duration-bound access - the hero SKU), `all_access_monthly`, `all_access_annual`, `lifetime` (all-exam, no expiry). Team/B2B SKUs are named as reserved identifiers but not implemented. SKU ids are permanent API surface (PAY-002 webhooks and prices rows key on them); renames are prohibited after first grant.
2. `src/lib/entitlements.ts` MUST resolve a user's effective access server-side: `resolveAccess(userId, examCode)` returns `{ tier: 'free' | 'premium', grants: Grant[] }`, honoring exam-scoped and all-access grants from the `entitlements` table (task-DATA-001), expiry (`ends_at`), and status. Resolution MUST be server-only (no client-computed access) and MAY cache per-request only.
3. Every entitlement mutation (grant, expiry, revocation, manual adjustment) MUST append a row to a new append-only `entitlement_events` table (migration in this task: event kind, user, sku, source, actor, timestamp, metadata). UPDATE and DELETE on the events table MUST be revoked at the SQL level; the current-state `entitlements` table is derived truth, the events are the audit trail.
4. The free-tier policy MUST be config-per-exam: `free_question_cap` (the doc's 20-40 range; the shipped default value is an operator decision at implementation time, recorded in the config with a comment citing the range source) and `free_full_mocks` (default 1 per exam per user, from the doc's free line). Policy config lives with the exam catalog so PAY-002's pricing pages and this gating read one source.
5. Enforcement MUST be server-side in the serving paths: (a) practice assembly for free tier draws from the capped question subset (a stable per-exam subset, not a random rotation - the cap is a content boundary, not a meter); (b) exam-mode sittings beyond the free mock count for that exam require premium; (c) `items.explanations` (per-option rationales) are served only to premium; free tier receives correct/incorrect and the correct answer key after grading. Client code MUST NOT be the gate - payload shaping happens in `sittings.ts`/grade paths.
6. The entire enforcement layer MUST ship dark behind `ENTITLEMENTS_ENFORCED=off|on` (default `off`). With `off`, behaviour is byte-identical to today (everything free); with `on`, the free/premium line applies. Flipping to `on` is PAY-002's launch decision at its human-acceptance gate - this task MUST NOT enable it anywhere but tests and staging.
7. `GET /api/entitlements` MUST return the calling user's tier and grant summary for UI display (never for enforcement), rate-limited `read` class. `UpgradePrompt.tsx` MUST render the locked-state UI (cap reached, mock limit reached, explanations locked) with honest copy - the free tier remains genuinely useful per the doc's goodwill constraint; no fake urgency, no dark patterns, and prompts MUST NOT appear while enforcement is `off`.
8. `scripts/grant-entitlement.mjs` MUST let the operator grant/revoke entitlements manually (source: `manual`, actor recorded) for support, beta testers, and make-goods, dry-run default, writing through the same event-appending path as future webhook fulfillment.
9. Analytics events for gating moments (`upgrade_prompt_shown`, `upgrade_prompt_clicked`, cap-hit context) MUST extend the OBS-001 typed map so PAY-002 can measure conversion from day one of enforcement.
10. Donations MUST be untouched: no donation surface acquires entitlement semantics (a donation is not a purchase; the doc keeps the channels separate deliberately).
11. This task MUST NOT integrate any payment provider, render prices, or expose checkout (task-PAY-002 owns money movement); leaderboard, streaks, and existing dashboards remain free-tier features unchanged.

## §2 - Why this design

**Why ship dark (§1 #6)?** The doc's biggest monetization risk is cannibalizing the goodwill and virality of the free product. Landing the machinery (schema, gating, prompts) with enforcement off separates the engineering risk (touching assembly/grading) from the business decision (where the line sits, when it applies). The flip becomes a reversible flag with a human gate rather than a deploy.

**Why a stable free subset instead of a metered rotation (§1 #5)?** A per-user meter over the full bank leaks the whole bank to patient free users and makes the cap feel like surveillance. A stable curated subset is honest ("these 30 questions are free forever"), SEO-friendly (the free surface is a permanent, linkable asset), and matches the doc's "free-forever core" framing.

**Why append-only events under a derived current-state table (§1 #3)?** Money-adjacent state disputes ("I paid, where is my access") are resolved by history, not by current state. Append-only at the SQL-grant level (the discipline's rule 12) means no handler bug can rewrite history; PAY-002's webhook fulfillment writes through the same path, so provider events and manual grants share one audit trail.

**Why explanations as the premium anchor (§1 #5)?** The doc identifies per-option "why each distractor is wrong" as the thing people pay for, and CONTENT-002 pre-generates them at near-zero marginal cost - high perceived value, zero serving cost, and gating them never blocks a learner from completing free practice (feedback stays, depth is premium).

**Why server-only resolution (§1 #2, #5)?** Client-side gating of content that is already in the payload is not gating. The serving paths already shape payloads (DATA-001's no-answer-leak design); entitlement shaping composes into the same choke points.

## §3 - Contract

```typescript
// src/lib/skus.ts
export type SkuId = 'per_exam_pass' | 'all_access_monthly' | 'all_access_annual' | 'lifetime';
export interface SkuDef {
  id: SkuId;
  scope: 'exam' | 'all';
  durationDays: number | null; // null = no expiry
  reserved?: boolean; // team_seats reserved, unimplemented
}
export const SKUS: Record<SkuId, SkuDef>;

// src/lib/entitlements.ts (server-only)
export interface Grant {
  sku: SkuId;
  examId: string | null;
  endsAt: string | null;
  source: string;
}
export function resolveAccess(
  userId: string | null,
  examCode: string
): Promise<{ tier: 'free' | 'premium'; grants: Grant[] }>; // anonymous users are always 'free'
export function enforcementOn(): boolean; // ENTITLEMENTS_ENFORCED
export function grantEntitlement(input: {
  userId: string;
  sku: SkuId;
  examId?: string;
  source: 'manual' | 'paddle' | 'migration';
  actor: string;
  endsAt?: string;
}): Promise<void>; // appends event
```

```sql
-- 20260910000000_entitlement_events.sql (shape)
create table entitlement_events (id bigint generated always as identity primary key,
  user_id uuid not null, sku text not null, exam_id uuid,
  kind text not null check (kind in ('granted','expired','revoked','adjusted')),
  source text not null, actor text not null, metadata jsonb,
  created_at timestamptz not null default now());
revoke update, delete on entitlement_events from anon, authenticated, service_role_writers; -- append-only
-- RLS on, no anon policies (repo pattern)
```

```text
Free policy config (with exam catalog): free_question_cap (operator-set within doc range 20-40),
free_full_mocks: 1. Gating points: assembleSitting (practice subset + mock count), gradeSitting
(explanations shaping), session route (mock-limit refusal with upgrade payload).
GET /api/entitlements -> { tier, grants[] } (display only).
```

## §4 - Acceptance criteria

1. **SKU registry stable** - The four SKUs exist with correct scope/duration shapes; a unit test pins ids (rename breaks the test by design) (traces_to: §1 #1).
2. **Resolution correct** - Fixtures: exam-scoped pass grants premium for its exam only; all-access grants for every exam; expired/revoked grants resolve free; anonymous resolves free (traces_to: §1 #2).
3. **Append-only audit** - Every grant/revoke via any path appends an event row; UPDATE/DELETE on events fail at SQL level in the integration test (traces_to: §1 #3).
4. **Config-driven caps** - Free cap and mock count read from exam config; changing config changes behaviour without code edits (fixture test) (traces_to: §1 #4).
5. **Free subset stable** - With enforcement on, free practice serves the same curated subset across sessions (set equality over repeated assemblies); premium draws the full bank (traces_to: §1 #5).
6. **Mock limit enforced** - Free user's second exam-mode sitting for the same exam is refused with the upgrade payload; premium unlimited; other exams unaffected (traces_to: §1 #5).
7. **Explanations gated** - With enforcement on, grade responses include per-option explanations only for premium; free receives correctness + answer key (deep payload scan both ways) (traces_to: §1 #5).
8. **Dark by default** - With `ENTITLEMENTS_ENFORCED=off` (or unset), all serving payloads are byte-identical to pre-task behaviour (recorded-fixture comparison) and no upgrade prompt renders (traces_to: §1 #6, #7).
9. **Display API + prompts honest** - `/api/entitlements` returns tier/grants; UpgradePrompt renders only at real gate hits with enforcement on; copy contains no countdown/fake-scarcity patterns (copy lint list) (traces_to: §1 #7).
10. **Manual grants audited** - The script grants/revokes with actor recorded, dry-run default, events appended (traces_to: §1 #8).
11. **Conversion analytics wired** - Gate-hit and prompt events exist in the typed map and fire in an enforcement-on e2e flow (traces_to: §1 #9).
12. **No scope creep** - No payment provider imports, no price rendering, donations surfaces untouched (grep + diff review) (traces_to: §1 #10, #11).

## §5 - Verification

```typescript
// tests/unit/entitlements.test.ts (vitest)
test('sku ids pinned; scope/duration shapes'); // AC 1
test('resolution matrix: exam pass, all-access, expired, revoked, anonymous'); // AC 2
test('caps and mock count read from exam config fixture'); // AC 4
test('upgrade prompt copy passes no-dark-pattern lint list'); // AC 9

// tests/integration/gating.test.ts (local supabase)
test('events append on grant/revoke; UPDATE/DELETE revoked at SQL'); // AC 3, 10
test('free subset stable across assemblies; premium full bank'); // AC 5
test('second free mock refused with upgrade payload; premium unlimited'); // AC 6
test('explanations premium-only in grade payload (deep scan)'); // AC 7
test('enforcement off: payloads byte-identical to recorded fixtures'); // AC 8
test('grant script: dry-run default, actor recorded'); // AC 10
test('gate-hit events fire in enforcement-on flow'); // AC 11
test('grep: no payment SDK imports; donation components untouched'); // AC 12
```

## §6 - Implementation skeleton

skus.ts -> entitlements.ts resolution over DATA-001 tables -> events migration (append-only grants) -> gating hooks in sittings.ts (assembly subset + mock count) and grade path (explanation shaping) behind `enforcementOn()` -> entitlements display API -> UpgradePrompt states -> grant script -> analytics map extension -> tests. The free curated subset is chosen per exam (flag in items metadata or a subset table) during implementation; the stability property, not the selection mechanism, is normative.

## §7 - Dependencies

- Upstream: task-DATA-001 (entitlements/prices tables, sittings layer) - hard.
- Downstream: task-PAY-002 fulfills entitlements from Paddle webhooks through `grantEntitlement`, renders prices, and owns the enforcement flip; the future adaptive/SRS premium features gate through the same resolution.
- Related: task-LEGAL-002 (refund page slots), task-OBS-001 (event map).

## §8 - Example payloads

```json
// GET /api/entitlements (premium user)
{
  "tier": "premium",
  "grants": [
    {
      "sku": "per_exam_pass",
      "examCode": "ccdv-f",
      "endsAt": "2026-11-01T00:00:00Z",
      "source": "paddle"
    }
  ]
}
```

```json
// mock-limit refusal (enforcement on)
{
  "error": "free_mock_limit",
  "examCode": "ccaf",
  "freeMocksUsed": 1,
  "upgrade": { "sku": "per_exam_pass" }
}
```

## §9 - Open questions

Deferred:

- The exact `free_question_cap` default (within the doc's 20-40) and the curated-subset selection are operator/content decisions at implementation, recorded in exam config (§1 #4) - the doc's range is the constraint, not a spec constant.
- Whether the free mock is per-user-forever or resets on exam version bump is decided when an exam first re-versions; default per-user-forever.
- Account identity remains email+PIN; if premium support burden demands real auth, that is the future auth task flagged in DATA-001 §9.

## §10 - Failure modes inventory

| Failure                                      | Detection                                       | Outcome                                     | Recovery                                |
| -------------------------------------------- | ----------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| Enforcement accidentally on at deploy        | AC 8 fixture comparison in CI; default off      | Free users suddenly gated - goodwill damage | Flag flip back; dark-launch invariant   |
| Client-side gate bypassed                    | Server-side shaping only (AC 5-7 payload scans) | Premium content leaks                       | No client gating exists to bypass       |
| Explanations leak to free via a new endpoint | Deep-scan pattern applied at grade path; AC 7   | Premium anchor devalued                     | Single shaping choke point              |
| Event table rewritten by a bug               | SQL-level revoke (AC 3)                         | Audit trail corruption                      | Append-only grants                      |
| Expired grant still resolves premium         | Resolution matrix AC 2 (expiry fixture)         | Revenue leak                                | ends_at honored in resolver             |
| SKU id renamed after grants exist            | AC 1 pin test                                   | Orphaned entitlements                       | Permanent-id rule §1 #1                 |
| Free subset rotates and leaks full bank      | AC 5 set-equality across assemblies             | Cap meaningless                             | Stable-subset property                  |
| Mock-limit check races (two parallel starts) | Integration double-start test under AC 6        | Free user gets 2 mocks                      | Count check inside assembly transaction |
| Upgrade prompts nag with enforcement off     | AC 8 no-prompt assertion                        | Premature paywall feel                      | enforcementOn() guards UI state         |
| Manual grant without audit trail             | Script writes through grantEntitlement (AC 10)  | Untracked access                            | Single write path                       |
| Donation button acquires purchase semantics  | AC 12 diff/grep                                 | Channel confusion the doc warns against     | Fence §1 #10                            |
| Anonymous users hit undefined tier paths     | AC 2 anonymous fixture                          | Serving errors                              | Anonymous = free, always defined        |

## §11 - Implementation notes

- The recorded-fixture byte-identity test (AC 8) is the task's keystone: capture serving payload fixtures before adding hooks, then assert identity with enforcement off. It converts "ships dark" from a claim into a regression gate.
- Mock-count enforcement belongs inside `assembleSitting`'s transaction so concurrent session starts cannot double-spend the free mock.
- Copy lint for prompts: forbid countdown timers, "only X left", and fake discounts in UpgradePrompt strings - a static list test keeps honesty mechanical.
- `grantEntitlement` is the single write path on purpose: PAY-002's webhook handler becomes a thin adapter over it, inheriting events and idempotency work done here.

_End of task-PAY-001._
