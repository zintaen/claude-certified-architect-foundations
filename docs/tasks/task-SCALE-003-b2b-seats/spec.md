---
id: task-SCALE-003
title: 'B2B team seats and seat management'
module: SCALE
class: product
priority: SHOULD
status: ready_to_implement
verify: T
phase: P5
milestone: 'P5 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-17
shipped: null
memory_chain_hash: null
related_tasks: [task-PAY-001, task-GROWTH-005]
depends_on: [task-PAY-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§C B2B: sell seats to bootcamps, universities, corporate L&D; AI-certification corporate training is a strong B2B wedge (Accenture 30k, Cognizant ~350k enterprise Claude adoption)'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/teams.ts
  - src/app/team/page.tsx
  - src/app/api/teams/route.ts
  - scripts/provision-team.mjs
  - supabase/migrations/20261101000000_teams.sql
  - tests/unit/teams.test.ts
  - tests/integration/teams.test.ts
modified_files:
  - src/lib/entitlements.ts
  - src/app/privacy/page.tsx
  - src/lib/analytics.ts
effort_hours: 24
subtasks:
  - 'Teams schema + seat-grant integration with entitlements (8h)'
  - 'Invite/assign/revoke lifecycle + admin surface (8h)'
  - 'Aggregate team reporting with member-privacy rules (4h)'
  - 'Provisioning script (sales-led) + tests (4h)'
risk_if_skipped: "The doc names B2B as the strongest wedge in the AI-cert niche - enterprises are training tens of thousands on Claude and a per-seat offer is how bootcamps and L&D buy. Without seat machinery, every team deal is manual entitlement grants with no admin surface, no aggregate reporting, and nothing an invoice can point at - deals stall at 'how do we roll this out'."
---

# task-SCALE-003 - B2B team seats and seat management

## §1 - Description

1. A migration MUST add `teams` (`id`, `name`, `admin_user_id`, `seat_count`, `sku`, `starts_at`, `ends_at`, `status`), `team_members` (`team_id`, `user_id`, `role` `admin` | `member`, `joined_at`, unique per team+user), and `team_invites` (`team_id`, `email` citext, `token` hash, `expires_at`, `accepted_at`). RLS on, no anon policies; access via the server layer only.
2. Seat semantics MUST be: a team carries `seat_count` seats for its SKU (team all-access as the launch SKU, using the reserved `team_seats` identifier from PAY-001's registry); an occupied seat grants its member premium through the normal `resolveAccess` path - implemented as team-derived grants that `entitlements.ts` resolves alongside individual grants, source `team`. Members MUST NOT stack rewards (an individually-premium user occupying a seat frees nothing automatically; the admin sees occupancy honestly).
3. Seat lifecycle MUST be admin-driven: invite by email (tokenized link, expiry, single-use), assign on acceptance if seats remain, revoke instantly (grant ends with the seat), reassign freed seats. Every lifecycle action MUST append to `entitlement_events` (the existing audit trail) with the team context in metadata.
4. Provisioning MUST support sales-led deals first: `scripts/provision-team.mjs` creates a team with seats/dates from an invoice-backed operator action (dry-run default, audited). Self-serve team checkout through Paddle (quantity-based) is the documented follow-up in the module doc, deliberately out of this task's scope - the seat machinery is identical either way.
5. The team admin surface (`/team`) MUST show: seat occupancy, invite management, member list with per-member status (invited/active/revoked), and aggregate team progress only - per-exam activation counts, average readiness band distribution, completion counts. Per-member item-level or score-level detail MUST NOT be shown without the member's explicit opt-in (a member-controlled toggle, default off): learners are people, not rows in an employer dashboard.
6. The privacy page MUST gain the team-visibility disclosure (what admins see by default, what opt-in reveals), and invited-email handling MUST follow the existing retention posture (invites purge after expiry).
7. Team members' individual experience MUST be unchanged except tier: no team branding takeover, no admin-forced study plans - the admin buys access, not control.
8. Analytics: `team_provisioned`, `seat_assigned`, `seat_revoked` extend the OBS-001 map (team id hashed; no member emails).
9. This task MUST NOT implement SSO/SCIM (enterprise identity is a future task with its own security bar), MUST NOT add per-member surveillance analytics, and MUST NOT build API/whitelabel licensing (the doc's later-phase item, still later).

## §2 - Why this design

**Why seats as team-derived grants through the existing resolver (§1 #2)?** One access-resolution path (PAY-001's) means every gate built in waves 2-3 works for team members with zero per-feature work, and the audited event trail stays single. A parallel "team access" check would fork the line the whole monetization architecture depends on.

**Why sales-led provisioning first (§1 #4)?** The doc's B2B buyers (bootcamps, universities, L&D) buy by invoice and rollout, not by credit-card self-serve. The operator script closes deals now; Paddle quantity checkout is an optimization once deal flow proves the shape.

**Why aggregate-only reporting with member opt-in (§1 #5)?** An employer dashboard of individual scores is a privacy trap (PDP/GDPR employee-data sensitivities) and poisons the learner's honest practice (people game watched metrics). Aggregates answer the buyer's real question (is the team progressing) without making the product a surveillance tool.

## §3 - Contract

```typescript
// src/lib/teams.ts (server-only)
export function provisionTeam(input: {
  name: string;
  adminEmail: string;
  seats: number;
  sku: 'team_seats';
  startsAt: string;
  endsAt: string;
  actor: string;
}): Promise<TeamId>; // script path
export function invite(teamId: string, email: string): Promise<void>; // token, expiry, single-use
export function acceptInvite(
  token: string,
  userId: string
): Promise<'assigned' | 'team_full' | 'expired'>;
export function revokeSeat(teamId: string, userId: string, actor: string): Promise<void>; // grant ends now
export function teamReport(teamId: string): Promise<AggregateReport>; // aggregates only
export function memberDetailOptIn(userId: string, teamId: string, optIn: boolean): Promise<void>;
```

```text
Resolution: entitlements.resolveAccess() unions individual grants + active team seat (source 'team').
/team: admin surface (occupancy, invites, members, aggregates); member view shows own seat status + opt-in toggle.
scripts/provision-team.mjs: dry-run default; writes through provisionTeam; entitlement_events metadata carries team_id.
```

## §4 - Acceptance criteria

1. **Schema + lifecycle** - Provision, invite (single-use, expiring), accept-if-seats, revoke-instantly, reassign - all fixture-tested; every action lands an entitlement_events row with team metadata (traces_to: §1 #1, #3).
2. **Seats grant through the one path** - A seated member resolves premium via `resolveAccess` for all-exam access; revocation flips resolution immediately; a full team rejects the next acceptance (traces_to: §1 #2).
3. **No stacking confusion** - An individually-premium member occupying a seat is displayed as such to the admin; resolution stays premium after either source ends while the other holds (union semantics fixture) (traces_to: §1 #2).
4. **Sales-led provisioning audited** - The script is dry-run default, requires actor, and produces the full team + admin invite in execute mode (traces_to: §1 #4).
5. **Aggregate-only reporting** - teamReport returns counts/distributions only; per-member detail absent unless that member opted in (toggle fixture both ways); default off (traces_to: §1 #5).
6. **Privacy disclosures** - Privacy page carries the team-visibility section; expired invites purge (traces_to: §1 #6).
7. **Member experience unchanged** - A seated member's surfaces render identically to an individually-premium member's (fixture comparison), plus the seat-status/opt-in block (traces_to: §1 #7).
8. **Events + fences** - Team events carry hashed ids, no emails; grep confirms no SSO/SCIM, no whitelabel/API surfaces, no per-member analytics beyond the opt-in path (traces_to: §1 #8, #9).

## §5 - Verification

```typescript
// tests/unit/teams.test.ts (vitest)
test('invite token: single-use, expiry, team-full rejection'); // AC 1, 2
test('union resolution: seat + individual grant semantics'); // AC 2, 3
test('teamReport shape: aggregates only; opt-in adds detail'); // AC 5

// tests/integration/teams.test.ts (local supabase)
test('full lifecycle with entitlement_events metadata rows'); // AC 1
test('revocation flips resolveAccess immediately'); // AC 2
test('provision script: dry-run default, actor required, execute path'); // AC 4
test('privacy section + invite purge'); // AC 6
test('member-surface fixture comparison + opt-in block'); // AC 7
test('event payload scan + grep fences'); // AC 8
```

## §6 - Implementation skeleton

Migration -> teams.ts lifecycle over the entitlements write path -> resolution union in entitlements.ts -> provisioning script -> /team admin + member views -> aggregate report queries (readiness bands reuse LEARN-001's band, not scores) -> privacy section -> analytics -> tests.

## §7 - Dependencies

- Upstream: task-PAY-002 (monetization live; invoicing context) - hard; PAY-001's resolver and events are the substrate; LEARN-001's bands feed aggregates where present (degrades to activation/completion counts without it).
- Downstream: SSO/SCIM and self-serve quantity checkout are documented follow-ups; GROWTH-005's sequences exclude team-managed members from consumer nudges where the admin requests it (flag noted for that task's config).
- External: invoice/contract handling stays in the business-ops track; the script is the bridge.

## §8 - Example payloads

```json
// teamReport (aggregates only)
{
  "teamId": "t-...",
  "seats": 50,
  "occupied": 42,
  "aggregates": {
    "activated": 31,
    "mocksCompleted": 118,
    "readinessBands": { "building": 12, "approaching": 19, "ready": 8, "insufficient": 3 }
  }
}
```

## §9 - Open questions

Deferred:

- Team SKU pricing is a prices-table operator decision (PAY-002's machinery); volume tiers are sales judgment.
- Whether team admins can gift seats across exams vs all-access-only at launch: all-access-only ships first (one SKU), per-exam team passes revisit with demand.
- SSO/SCIM trigger: first enterprise deal that requires it authors the task.

## §10 - Failure modes inventory

| Failure                                      | Detection                                            | Outcome                        | Recovery                       |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------ | ------------------------------ |
| Parallel access path forks the premium line  | Union-resolution AC 2/3 via the single resolver      | Gates drift per feature        | resolveAccess-only rule        |
| Revoked member keeps access                  | Immediate-flip AC 2                                  | Seat leakage                   | Grant ends with seat           |
| Invite token reuse/forwarding                | Single-use + expiry AC 1                             | Unpaid seats                   | Tokenized lifecycle            |
| Employer surveillance dashboard              | Aggregate-only + opt-in AC 5                         | Privacy trap, learner distrust | Member-controlled detail       |
| Team context missing from audit trail        | Events metadata AC 1                                 | Undiagnosable disputes         | entitlement_events discipline  |
| Provisioning without invoice backing         | Actor-required script AC 4                           | Untracked giveaways            | Audited operator action        |
| Seat counting races (two accepts, one seat)  | Team-full rejection under concurrency (AC 1 fixture) | Overselling                    | In-transaction occupancy check |
| Consumer nudges hit managed members          | GROWTH-005 exclusion flag (§7 note)                  | Channel conflict               | Config exclusion               |
| Invited emails linger                        | Purge AC 6                                           | Retention violation            | Expiry cleanup                 |
| Member emails in analytics                   | AC 8 scan                                            | PII leak                       | Hashed ids                     |
| Admin control creep (forced plans, branding) | Fence §1 #7 + AC 7                                   | Product identity erosion       | Access-not-control rule        |
| Whitelabel/API scope creep                   | Fence AC 8                                           | Later-phase item smuggled in   | Explicit exclusion             |

## §11 - Implementation notes

- Occupancy checks live inside the acceptance transaction (same discipline as PAY-001's mock counting) - seat races are the first thing a bootcamp's day-one rollout will find.
- Aggregate readiness uses band distributions, never averaged scores - bands are the honest unit LEARN-001 established, and they resist individual re-identification in small teams (suppress bands for teams under a config floor).
- Keep the admin surface boring and fast: occupancy, invites, aggregates. B2B buyers need rollout confidence, not dashboards to live in.

_End of task-SCALE-003._
