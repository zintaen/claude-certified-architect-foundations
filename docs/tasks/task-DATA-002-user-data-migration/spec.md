---
id: task-DATA-002
title: 'Zero-downtime migration preserving accounts, streaks, history, donations'
module: DATA
class: product
priority: MUST
status: done
verify: T
phase: P1
milestone: 'P1 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEO-001]
depends_on: [task-DATA-001, task-OBS-001]
blocks: [task-SEO-001, task-SCALE-001, task-SCALE-002]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§F Migration plan: preserve accounts/streaks/history/donations; dual-write or staged backfill; zero downtime via blue-green; verify post-cutover'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/cutoverFlags.ts
  - src/app/api/leaderboard/route.ts
  - docs/migration/DATA-002-mapping.md
  - scripts/migrate-users.mjs
  - scripts/migrate-history.mjs
  - scripts/parity-check.mjs
  - supabase/migrations/20260810000000_migration_log.sql
  - supabase/migrations/20260810000001_legacy_and_migration_grants.sql
  - tests/integration/migration.test.ts
  - tests/e2e/cutover-parity.spec.ts
modified_files:
  - src/lib/api.ts
  - src/lib/serverResults.ts
  - src/lib/serverSession.ts
  - src/app/api/exam/grade/route.ts
  - src/app/api/result/route.ts
  - src/app/api/session/route.ts
  - src/app/api/exams/[code]/session/route.ts
  - src/app/exam/page.tsx
  - src/app/dashboard/page.tsx
  - src/app/leaderboard/page.tsx
effort_hours: 20
subtasks:
  - 'Inventory + mapping doc with per-store disposition (3h)'
  - 'User + history backfill scripts, idempotent with migration_log (6h)'
  - 'Shadow dual-write soak + parity job (4h)'
  - 'Per-surface read cutover flags + rollback rehearsal (5h)'
  - 'Post-cutover verification against OBS baseline (2h)'
risk_if_skipped: "The doc calls losing users' accounts, streaks, and history during the rebuild a direct betrayal of the goodwill the viral moment created, and pairs it with the SEO risk as Phase 1's two existential threats. Cutting over the read/write paths without staged backfill, parity checking, and instant rollback converts a schema upgrade into a bet-the-site event on a production system with real users."
---

# task-DATA-002 - Zero-downtime migration preserving accounts, streaks, history, donations

## §1 - Description

1. The migration MUST begin with a written inventory: `docs/migration/DATA-002-mapping.md` enumerating every existing production data store - the Supabase tables (`exam_results`, `subscribers`, the leaderboard table, the active-session/resume table) and every localStorage/client-persisted key the app writes (exam store persistence, streak/dismissal keys) - with a per-store disposition: `migrate`, `keep_in_place`, or `retire_with_note`. No store may be left undisposed; the doc is the checklist the cutover is verified against.
2. `scripts/migrate-users.mjs` MUST backfill `users` (task-DATA-001 schema) from the distinct identities present in existing tables (email + pin_hash pairs), preserving `pin_hash` byte-for-byte (the PIN scheme MUST keep working without any user re-enrollment). The script MUST NOT invent users for rows without an email.
3. `scripts/migrate-history.mjs` MUST backfill historical sittings from `exam_results` rows (score, breakdown, timestamps preserved). Per-item `item_responses` rows MUST be created only where the stored breakdown actually contains per-question data; where it does not, the sitting carries its aggregate `breakdown` jsonb and no per-item rows - reconstructing per-item responses from aggregates is prohibited (fabricated psychometric data is worse than none).
4. Backfill scripts MUST be idempotent and resumable: a `migration_log` table records each migrated source row's natural key and target id; re-runs skip logged rows; partial failures resume from the log. Scripts run against production only in explicit `--execute` mode (default is dry-run with counts).
5. The dual-write soak MUST precede any read cutover: `DB_GRADE_PATH=shadow` (task-DATA-001's flag) runs in production for a soak window that satisfies the 14-day analytics baseline floor from `docs/analytics-baseline.md` (task-OBS-001). During the soak, `scripts/parity-check.mjs` MUST compare legacy writes against new-schema writes (row counts, score equality, identity linkage) and report discrepancies; unresolved discrepancies block cutover.
6. Read cutover MUST be staged per surface behind independent env flags: (a) exam/practice serving from DB (`SERVE_FROM_DB`), (b) dashboard history reads, (c) leaderboard reads. Each flag flips one surface; each MUST be individually revertible by flag flip alone (no deploy, no data operation) for the whole soak-plus-verification period.
7. Cutover MUST be zero-downtime: additive deploys only, no maintenance window, legacy write paths keep running until every surface has soaked on DB reads and the operator records cutover acceptance. Removing legacy paths is the final slice and MUST NOT ship in the same deploy as any flag flip.
8. Post-cutover verification MUST compare the OBS-001 funnels (activation, exam completion, subscribe conversion) for the window after each surface flip against the pre-cutover baseline, and MUST verify: existing users can resume with email+PIN, historical results render identically (spot-check set enumerated in the mapping doc), streak and leaderboard values match pre-cutover snapshots. A regression beyond the variance band documented in the baseline doc triggers rollback of that surface's flag.
9. `subscribers` and donation-related records MUST be preserved untouched or migrated verbatim per their mapping-doc disposition; the donation channel (external provider links) MUST keep functioning throughout - the mapping doc records where donation history actually lives and why it is or is not migrated.
10. A rollback rehearsal MUST be performed on a staging clone before any production flag flip: seed clone from production snapshot, run backfills, flip all flags, flip them back, verify legacy paths still serve correctly. The rehearsal result is recorded in the mapping doc.
11. This task MUST NOT change any public URL (task-SEO-001 owns URL integrity and follows this task), MUST NOT alter the DATA-001 schema beyond the `migration_log` table, and MUST NOT delete any legacy table - retirement happens in a later cleanup task after a full retention window.
12. All migration processing MUST occur within the existing Supabase project and repo tooling - no data export to third-party services; dumps used for rehearsal MUST be handled per the privacy policy's storage commitments and deleted after the rehearsal.

## §2 - Why this design

**Why an inventory with forced dispositions (§1 #1)?** Migration losses come from the stores nobody listed - client-side streaks and resume checkpoints are exactly the kind of state a schema-focused plan forgets. Forcing every store through migrate/keep/retire makes "we forgot localStorage" impossible by construction, and gives cutover verification a closed checklist.

**Why forbid reconstructing item_responses (§1 #3)?** The IRT pipeline (CONTENT-002) will calibrate on `item_responses`. Backfilled rows invented from aggregate scores would look like data and poison difficulty/discrimination estimates invisibly. An honest gap ("history before 2026-08 has sitting-level data only") is analytically safe; plausible fabrication is not.

**Why per-surface flags instead of one cutover flag (§1 #6)?** Exam serving, dashboard, and leaderboard have different risk profiles and different rollback costs. One flag means one blast radius; three flags mean a leaderboard read bug does not force rolling back exam serving. The doc's "staged cutover" is made concrete as surface granularity.

**Why flag-flip rollback with no data operation (§1 #6, #7)?** Rollback that requires a reverse migration is not rollback, it is a second migration performed under incident pressure. Keeping legacy writes running through the soak means the legacy state is always current, so reverting reads is free.

**Why tie the soak to the OBS baseline floor (§1 #5, #8)?** The doc makes Phase 0 analytics the regression detector for exactly this cutover. The 14-day floor and the variance band live in `analytics-baseline.md`; this spec consumes them rather than inventing its own thresholds.

## §3 - Contract

```text
Env flags (all default off; each independently revertible):
  DB_GRADE_PATH=off|shadow|on      (from DATA-001; 'on' only after soak acceptance)
  SERVE_FROM_DB=off|on             exam/practice question serving source
  DASHBOARD_FROM_DB=off|on         history reads
  LEADERBOARD_FROM_DB=off|on       leaderboard reads

migration_log (supabase/migrations/20260810000000_migration_log.sql):
  source_table text, source_key text, target_table text, target_id uuid,
  migrated_at timestamptz, primary key (source_table, source_key)

scripts (all: dry-run default, --execute to write, exit non-zero on any discrepancy):
  migrate-users.mjs     exam_results+subscribers identities -> users
  migrate-history.mjs   exam_results -> sittings (+item_responses only where per-question data exists)
  parity-check.mjs      soak comparator: legacy rows vs new rows; prints diff report
```

```markdown
docs/migration/DATA-002-mapping.md sections (normative checklist):

1. Store inventory + dispositions 2. Identity mapping rules
2. History mapping rules 4. Spot-check set for post-cutover verification
3. Rollback rehearsal record 6. Soak log + parity reports
4. Cutover acceptance record 8. Legacy retirement pointer (future task)
```

## §4 - Acceptance criteria

1. **Nothing undisposed** - The mapping doc lists every Supabase table in the project and every localStorage key the code writes (enumerated by grep), each with a disposition; a unit test cross-checks the doc's table list against the live schema listing (traces_to: §1 #1).
2. **Identity preserved** - After user backfill, every distinct (email, pin_hash) from legacy tables exists exactly once in `users` with pin_hash byte-identical; a legacy user can authenticate a dashboard read on the DB path with their existing PIN (traces_to: §1 #2).
3. **History preserved, not fabricated** - Sitting count equals legacy result count; scores/timestamps match; `item_responses` rows exist only for sittings whose legacy breakdown carried per-question data (test includes one aggregate-only fixture asserting zero per-item rows) (traces_to: §1 #3).
4. **Idempotent + resumable** - Running each script twice produces zero new rows; killing a run mid-way and re-running completes without duplicates (migration_log asserted) (traces_to: §1 #4).
5. **Dry-run is default** - Without `--execute`, scripts write nothing and print counts; integration test asserts no row changes in dry-run (traces_to: §1 #4).
6. **Parity gate works** - With a seeded discrepancy (one legacy row altered), parity-check exits non-zero and names the row; clean data exits zero (traces_to: §1 #5).
7. **Per-surface flags** - Each of the three read flags flips only its surface (e2e: with SERVE_FROM_DB=on and others off, dashboard still reads legacy); flipping any flag back restores legacy behaviour with no data operation (traces_to: §1 #6).
8. **Zero-downtime shape** - No deploy in the task removes a legacy path while any flag can still route to it; legacy-path removal is absent from this task's diff entirely (traces_to: §1 #7, #11).
9. **Post-cutover checks defined and executable** - The spot-check set renders identically on both paths (e2e compares legacy vs DB rendering for the fixture set); funnel comparison procedure references the baseline doc's variance band (traces_to: §1 #8).
10. **Subscribers/donations intact** - subscribers row count and content unchanged post-migration; donation links functional in e2e; mapping doc records donation-history disposition (traces_to: §1 #9).
11. **Rehearsal recorded** - Mapping doc §5 contains the staging rehearsal record (dates, snapshot id, flip/flip-back results) before any production execute-mode run; the task cannot pass review without it (traces_to: §1 #10).
12. **Privacy boundary** - Scripts contain no network egress beyond the Supabase project URL (grep test for fetch/http targets); rehearsal-dump deletion is a checklist line in §5 of the mapping doc (traces_to: §1 #12).

## §5 - Verification

```typescript
// tests/integration/migration.test.ts (vitest, local supabase stack with legacy fixtures)
test('mapping doc table list matches live schema enumeration'); // AC 1
test('user backfill: identity set equality + pin_hash byte equality'); // AC 2
test('history backfill: counts, scores, timestamps; aggregate-only fixture -> no item rows'); // AC 3
test('double-run + kill/resume idempotency via migration_log'); // AC 4
test('dry-run default writes nothing'); // AC 5
test('parity-check: seeded discrepancy -> non-zero exit naming the row'); // AC 6
test('scripts have no third-party egress (grep)'); // AC 12
```

```typescript
// tests/e2e/cutover-parity.spec.ts (playwright, staged env)
test('flag matrix: each surface flips independently and reverts cleanly'); // AC 7
test('spot-check set renders identically on legacy vs DB paths'); // AC 9
test('legacy user logs into dashboard with existing PIN on DB path'); // AC 2
test('subscribe + donate flows functional with all flags on'); // AC 10
// AC 8, 11: verified in review against the diff and the mapping doc record (manual -
// justified: "removal absent from diff" and "rehearsal happened" are review facts, not runtime behaviour)
```

## §6 - Implementation skeleton

Inventory + mapping doc -> migration_log migration -> backfill scripts (dry-run first, fixtures in CI) -> staging rehearsal (record it) -> production backfill in execute mode -> enable shadow dual-write, run parity job through the soak window -> flip read flags one surface at a time with baseline comparison between flips -> operator cutover acceptance recorded -> (later task) legacy retirement. `serverResults.ts` / `serverSession.ts` gain DB-path implementations behind the flags, delegating to DATA-001's `sittings.ts`.

## §7 - Dependencies

- Upstream: task-DATA-001 (schema, shadow grade path, sittings layer) - hard; task-OBS-001 (baseline doc, 14-day floor, variance band) - hard.
- Downstream: task-SEO-001 executes its URL-integrity checks against the cutover this task performs (blocks edge); the legacy-retirement cleanup task is future work pointed at by mapping doc §8.
- External: Supabase project access for backfills; a staging clone environment for the rehearsal.

## §8 - Example payloads

```text
$ node scripts/migrate-history.mjs            # dry-run
exam_results: 18,342 rows -> would create 18,342 sittings (4,120 with per-question data -> 371,204 item_responses)
skipped (already in migration_log): 0
DRY RUN - no writes. Pass --execute to apply.

$ node scripts/parity-check.mjs --window 24h
legacy grade writes: 214 | new-schema sittings: 214 | score mismatches: 0 | identity misses: 0
PARITY OK
```

## §9 - Open questions

Deferred:

- The exact soak length beyond the 14-day floor is an operator call made on parity-report cleanliness and traffic volume at the time; the floor is normative, the ceiling is judgment.
- Legacy table retirement timing (and its retention obligations) is a follow-up task created at cutover acceptance (mapping doc §8 is the pointer).
- If the streak mechanism turns out to be purely client-side at inventory time, its disposition is `keep_in_place` with a note - no server migration invented for client state.

## §10 - Failure modes inventory

| Failure                                       | Detection                                                        | Outcome                     | Recovery                                                  |
| --------------------------------------------- | ---------------------------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| Forgotten store (client streaks, resume keys) | Inventory cross-check AC 1; grep-driven localStorage enumeration | Silent user-visible loss    | Disposition checklist; add store, re-verify               |
| pin_hash scheme mismatch breaks logins        | AC 2 byte-equality + e2e PIN login                               | Locked-out users            | Preserve hash verbatim; no re-hash during migration       |
| Fabricated item_responses poison future IRT   | AC 3 aggregate-only fixture                                      | Corrupt psychometrics       | Prohibition in §1 #3                                      |
| Backfill dies mid-run                         | migration_log resume AC 4                                        | Partial state               | Resume from log; idempotent upserts                       |
| Accidental production write during testing    | Dry-run default AC 5                                             | Data damage                 | --execute explicitness                                    |
| Dual-write drift (legacy and new disagree)    | Parity job AC 6 during soak                                      | Wrong data goes live        | Cutover blocked until parity clean                        |
| One surface breaks, whole cutover rolled back | Per-surface flags AC 7                                           | Excess blast radius         | Independent flags                                         |
| Rollback needs reverse migration              | Legacy writes continue through soak (§1 #7)                      | Incident-pressure migration | Flag-flip-only rollback invariant                         |
| Funnel regression undetected post-flip        | Baseline comparison AC 9 vs OBS variance band                    | Slow bleed of signups       | Per-flip comparison windows                               |
| Leaderboard identity dedup merges two users   | Identity mapping rules in doc §2; AC 2 set equality              | Wrong attribution           | Natural key = email; collisions surfaced in parity report |
| Rehearsal skipped under schedule pressure     | AC 11 review gate requires the record                            | Untested cutover            | Non-negotiable review item                                |
| Rehearsal dump lingers with real PII          | Doc §5 deletion checklist AC 12                                  | Privacy breach              | Recorded deletion step                                    |
| Legacy removal deployed with a flag flip      | AC 8 diff rule                                                   | No rollback path            | Removal is a separate later slice                         |

## §11 - Implementation notes

- Enumerate localStorage keys by grepping `localStorage.` and the zustand persist config rather than from memory - the codebase, not recollection, is the inventory source.
- Parity tolerance is zero for scores and identity; timing fields may differ by write-path latency - the comparator normalizes timestamps to second precision before diffing.
- Keep backfill batch sizes modest (hundreds per transaction) so production backfill never long-locks tables the live site is writing.
- The mapping doc is a living artifact through the soak: parity reports and flip records append to it; at acceptance it becomes the audit trail the doc's migration plan asked for.

_End of task-DATA-002._
