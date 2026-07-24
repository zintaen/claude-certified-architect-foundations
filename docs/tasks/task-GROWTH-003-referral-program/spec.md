---
id: task-GROWTH-003
title: 'Referral program with entitlement-day rewards'
module: GROWTH
class: product
priority: SHOULD
status: done
verify: T
phase: P4
milestone: 'P4 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001, task-PAY-002]
depends_on: [task-PAY-001, task-OBS-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§E: referral programs among retention/acquisition channels; §C: donations and paywall coexist - rewards are access, not cash'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/referrals.ts
  - src/app/api/referrals/route.ts
  - supabase/migrations/20261010000000_referrals.sql
  - tests/unit/referrals.test.ts
  - tests/integration/referrals.test.ts
modified_files:
  - src/app/dashboard/page.tsx
  - src/lib/analytics.ts
effort_hours: 14
subtasks:
  - 'Referral codes + attribution + reward issuance via grantEntitlement (6h)'
  - 'Anti-abuse rules + caps (4h)'
  - 'Dashboard share surface + analytics + tests (4h)'
risk_if_skipped: 'Referrals are the cheapest acquisition channel for a product people already recommend in study groups - the doc lists them alongside community as the retention/acquisition pair. Without structured attribution, that word of mouth happens anyway and converts anonymously; with it, sharers earn premium days and the loop becomes measurable and rewardable.'
---

# task-GROWTH-003 - Referral program with entitlement-day rewards

## §1 - Description

1. Every identified user MUST get a stable referral code and share URL. A migration adds `referrals` (`code` unique, `referrer_user_id`, `created_at`) and `referral_events` (append-only: `code`, `referred_user_id`, `kind` `signup` | `qualified` | `rewarded`, `created_at`, metadata) - same append-only SQL discipline as `entitlement_events`.
2. Attribution MUST be signup-time and consent-free: the share URL carries the code; on account creation (email capture) the code binds to the new user once, first-touch wins, self-referral rejected (same email/user). No cross-site tracking, no cookies beyond the first-party visit parameter - the mechanism MUST work under the LEGAL-002 default-deny analytics posture.
3. Qualification MUST require real activation, not signup: the referred user's first completed mock (`exam_graded`, the OBS-001 activation event) marks the referral `qualified`. Signup-only rewards invite disposable-email farming.
4. Rewards MUST be premium access days, never cash or discounts: on qualification, the referrer receives a config number of all-access days issued through PAY-001's `grantEntitlement` (source `referral`, audited in `entitlement_events`); the referred user MAY receive a smaller welcome grant (config; default on). Rewards stack up to a config cap per referrer per month; beyond the cap, referrals still count (leaderboard/recognition) but stop granting.
5. Anti-abuse MUST be structural: per-IP and per-device qualification velocity limits (reusing SEC-001's limiter store), disposable-email domain rejection list (config), self-referral and circular-referral rejection, and an operator review queue flag when a referrer's qualification rate exceeds a config anomaly threshold. Rewards for flagged referrals hold until operator disposition (grant script path, audited).
6. The dashboard MUST gain the share surface: code, share URL, copy action, referral status counts (invited/qualified/rewarded), and honest program terms (what qualifies, caps, no cash value) linked from the surface; program terms live with the LEGAL-002 policy pages' register and MUST pass the no-dark-pattern copy lint.
7. With `ENTITLEMENTS_ENFORCED=off`, the program MUST still attribute and count (codes work, events record) but reward issuance is deferred until enforcement is on - rewards of premium days are meaningless before the premium line exists; deferred rewards are granted retroactively at flip time (one-shot backfill, audited).
8. Analytics: `referral_link_shared`, `referral_signup`, `referral_qualified` extend the OBS-001 map (code hashed in properties; no referred-user email).
9. This task MUST NOT introduce cash payouts or discount codes (Paddle-side promotions belong to PAY-002's pricing ops), MUST NOT weaken the free line, and MUST NOT add tracking beyond the first-party visit parameter.

## §2 - Why this design

**Why activation-gated qualification (§1 #3)?** Signup-gated referral rewards are farmed within hours of launch (disposable emails cost nothing). The activation event (first completed mock) is the doc's own KPI, requires real effort, and aligns the reward with the metric the program exists to move.

**Why premium days instead of cash or discounts (§1 #4)?** Cash creates payout/tax/fraud surfaces a MoR does not absorb; discounts interact badly with PPP tiers (stacking arbitrage). Premium days cost near-zero marginally, reward exactly the behavior wanted (usage), and issue through the existing audited grant path - no new money machinery.

**Why defer rewards until enforcement-on (§1 #7)?** While everything is free, "premium days" grant nothing. Counting attributions now and backfilling rewards at the flip preserves fairness for early sharers without inventing a parallel reward currency.

**Why structural anti-abuse over trust (§1 #5)?** The doc's PPP risk analysis applies here too: any granted value gets farmed at High likelihood. Velocity limits, activation gating, and hold-for-review anomalies bound the damage to the cap while keeping the honest path frictionless.

## §3 - Contract

```typescript
// src/lib/referrals.ts (server-only)
export function codeFor(userId: string): Promise<string>; // stable, created on demand
export function bindReferral(
  code: string,
  newUserId: string
): Promise<'bound' | 'rejected_self' | 'rejected_bound' | 'rejected_abuse'>;
export function onActivation(userId: string): Promise<void>; // exam_graded hook -> qualify + reward/hold
export const REFERRAL_CONFIG: {
  rewardDaysReferrer: number;
  rewardDaysReferred: number;
  monthlyRewardCap: number;
  anomalyQualRatePerDay: number;
  disposableDomains: string[];
};
```

```sql
-- 20261010000000_referrals.sql (shape)
create table referrals (code text primary key, referrer_user_id uuid not null references users unique, created_at timestamptz not null default now());
create table referral_events (id bigint generated always as identity primary key, code text not null references referrals,
  referred_user_id uuid not null references users, kind text not null check (kind in ('signup','qualified','rewarded','held')),
  metadata jsonb, created_at timestamptz not null default now());
revoke update, delete on referral_events from public; -- append-only, repo pattern
-- unique (code, referred_user_id, kind); RLS on, no anon policies
```

## §4 - Acceptance criteria

1. **Codes + binding** - Stable code per user; first-touch binding once per referred user; self- and re-binding rejected (traces_to: §1 #1, #2).
2. **Consent-free mechanics** - Attribution works with analytics consent rejected (e2e under default-deny); no non-essential cookie written by the referral path (traces_to: §1 #2).
3. **Activation qualifies** - Signup alone never rewards; the referred user's first `exam_graded` marks qualified and triggers issuance (or hold) exactly once, concurrency-safe (traces_to: §1 #3).
4. **Rewards via the audited path** - Qualification grants config days through `grantEntitlement` source `referral` with `entitlement_events` rows; caps stop granting but keep counting; referred-side welcome grant per config (traces_to: §1 #4).
5. **Abuse bounded** - Disposable-domain signup rejected from binding; velocity fixture trips the limiter; anomaly fixture routes rewards to `held` pending operator disposition through the grant script (traces_to: §1 #5).
6. **Dashboard surface honest** - Share surface renders code/URL/counts and program terms; copy passes the no-dark-pattern lint (traces_to: §1 #6).
7. **Dark-mode deferral + backfill** - With enforcement off: binding and qualification record, rewards defer; the flip-time backfill grants deferred rewards once, idempotently (traces_to: §1 #7).
8. **Events shaped** - Referral events carry hashed code, never referred emails (traces_to: §1 #8).
9. **Fences** - No cash/discount surfaces; no new tracking params beyond the visit parameter; free line untouched (grep + diff review) (traces_to: §1 #9).

## §5 - Verification

```typescript
// tests/unit/referrals.test.ts (vitest)
test('stable code; first-touch bind; self/re-bind rejected'); // AC 1
test('disposable-domain rejection; velocity limiter fixture'); // AC 5
test('cap arithmetic: grants stop, counts continue'); // AC 4

// tests/integration/referrals.test.ts (local supabase)
test('consent-rejected e2e: bind + qualify still work, no extra cookies'); // AC 2
test('activation qualifies exactly once under concurrent grades'); // AC 3
test('grantEntitlement source=referral + events rows; welcome grant'); // AC 4
test('anomaly -> held; operator script releases (audited)'); // AC 5
test('dashboard surface + terms + copy lint'); // AC 6
test('enforcement-off deferral; flip backfill idempotent'); // AC 7
test('event payload scan'); // AC 8
test('grep fences'); // AC 9
```

## §6 - Implementation skeleton

Migration -> referrals.ts (code, bind, onActivation with in-transaction qualification) -> visit-parameter capture on signup surfaces -> reward issuance/hold via PAY-001's single write path -> dashboard surface + terms -> deferral/backfill flag logic -> analytics -> tests.

## §7 - Dependencies

- Upstream: task-PAY-001 (grantEntitlement, events, enforcement flag) and task-OBS-001 (activation event definition) - hard. SEC-001's limiter store reused.
- Downstream: none; PAY-002's launch checklist gains the backfill line (noted in its monetization-launch doc at implementation).
- External: none.

## §8 - Example payloads

```json
// referral_events rows for one successful referral
[
  { "kind": "signup", "code": "csk-stephen-7f3a", "referred_user_id": "9b..." },
  { "kind": "qualified", "code": "csk-stephen-7f3a", "referred_user_id": "9b..." },
  {
    "kind": "rewarded",
    "code": "csk-stephen-7f3a",
    "referred_user_id": "9b...",
    "metadata": { "grant": "all_access", "days": 0, "note": "config value at issuance" }
  }
]
```

## §9 - Open questions

Deferred:

- Reward-day amounts, caps, and the anomaly threshold are operator program decisions set in REFERRAL_CONFIG at launch (growth lever, not spec constants).
- Public referral leaderboards/recognition beyond counts are future gamification once the base loop proves itself.

## §10 - Failure modes inventory

| Failure                                  | Detection                               | Outcome                              | Recovery                                |
| ---------------------------------------- | --------------------------------------- | ------------------------------------ | --------------------------------------- |
| Disposable-email farming                 | Activation gate AC 3 + domain list AC 5 | Reward theft                         | Structural qualification                |
| Self/circular referral                   | Bind rejection AC 1                     | Free premium loop                    | Identity checks at bind                 |
| Concurrent grades double-reward          | Once-only qualification AC 3            | Duplicate grants                     | In-transaction uniqueness               |
| Reward farm past caps                    | Cap arithmetic AC 4                     | Bounded exposure                     | Monthly cap config                      |
| Anomalous referrer mass-farming          | Held queue AC 5                         | Large-scale abuse                    | Operator disposition via audited script |
| Consent posture broken by tracking       | AC 2 default-deny e2e                   | GDPR/PDP regression                  | First-party visit parameter only        |
| Rewards granted while everything is free | Deferral AC 7                           | Meaningless grants, backlash at flip | Defer + backfill design                 |
| Backfill double-grants at flip           | Idempotent backfill AC 7                | Duplicate days                       | Event-keyed issuance                    |
| Cash/discount creep                      | Fence AC 9                              | Tax/fraud/PPP-stacking surfaces      | Access-days-only rule                   |
| Referred emails leak to analytics        | AC 8 scan                               | PII exposure                         | Hashed-code properties                  |
| Dark-pattern share copy                  | Lint AC 6                               | Trust erosion                        | Shared lint list                        |
| Event table rewritten                    | Append-only revoke (migration)          | Audit loss                           | SQL-level discipline                    |

## §11 - Implementation notes

- The visit parameter should survive the signup flow via the existing session/localStorage of the signup surface, not a new cookie - keep the LEGAL-002 posture clean.
- Qualification must run inside the grade transaction path (same place PAY-001 counts mocks) so "first completed mock" has one definition everywhere.
- Program terms copy is short and truthful: what counts, the cap, no cash value, abuse forfeits - four sentences beat a legal wall nobody reads.

_End of task-GROWTH-003._
