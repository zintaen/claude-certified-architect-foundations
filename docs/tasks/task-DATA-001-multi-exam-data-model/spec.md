---
id: task-DATA-001
title: 'Multi-vendor multi-exam data model with RLS on Supabase'
module: DATA
class: product
priority: MUST
status: done
verify: T
phase: P1
milestone: 'P1 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001, task-CONTENT-001]
depends_on: []
blocks:
  [
    task-DATA-002,
    task-CONTENT-002,
    task-PAY-001,
    task-LEARN-001,
    task-LEARN-003,
    task-LEARN-005,
    task-GROWTH-004,
  ]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Database - keep Supabase; RLS fits multi-tenant; premature rebuild is waste'
  - '§F Data model: Vendor, Certification, Exam (version/blueprint), Domain/Objective, Item (provenance), Explanation, ItemResponse, User, Attempt, Subscription/Entitlement, Price (by geo tier)'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - supabase/migrations/20260801000000_platform_schema.sql
  - supabase/migrations/20260801000001_platform_rls.sql
  - scripts/seed-catalog.mjs
  - src/lib/catalog.ts
  - src/lib/sittings.ts
  - src/app/api/catalog/route.ts
  - src/app/api/exams/[code]/session/route.ts
  - tests/integration/schema.test.ts
  - tests/integration/serving.test.ts
modified_files:
  - src/core/database.types.ts
  - src/lib/rateLimit.ts
  - src/app/api/exam/grade/route.ts
effort_hours: 24
subtasks:
  - 'Schema migration: catalog + items + responses + entitlement/price scaffolds (6h)'
  - 'RLS migration + service-role access pattern (3h)'
  - 'Seed script: file bank + provenance -> DB, idempotent (4h)'
  - 'Data-access layer + serving endpoints (assembly without answer keys) (6h)'
  - 'Type regeneration + integration tests on local Supabase (5h)'
risk_if_skipped: 'Every expansion in the plan - more exams, the item pipeline, entitlements, PPP prices, IRT calibration - presupposes a multi-exam data model. Today the bank is TypeScript files compiled into the bundle, one exam is hardcoded across routes, and every user answer is thrown away (no ItemResponse capture, so no psychometrics ever). Building content or monetization features on the file model means rebuilding them again immediately after; the doc sequences this as the Phase 1 foundation for exactly that reason.'
---

# task-DATA-001 - Multi-vendor multi-exam data model with RLS on Supabase

## §1 - Description

1. A new Supabase migration MUST create the catalog spine: `vendors`, `certifications`, `exams`, `domains`, `objectives` with the relationships vendor 1-N certification 1-N exam 1-N domain 1-N objective. `exams` MUST carry `code` (unique, URL-safe, e.g. `ccaf`), `version`, `blueprint_doc` (repo path of the snapshot per task-CONTENT-001), `status` (`draft` | `live` | `retired`), and per-exam pass/scoring config (`pass_threshold_pct`, `question_count`, `duration_minutes`).
2. The migration MUST create `items` with: `exam_id`, `domain_id`, nullable `objective_id`, `stem`, `options` (jsonb array of `{key, text}`), `correct_key`, `explanations` (jsonb: per-option rationale, nullable until generated), `item_status` (`beta` | `scored` | `retired` | `canary`), `provenance` (jsonb, schema of task-CONTENT-001's `ItemProvenance`), `version` (int, monotonic), and timestamps. Item text edits MUST bump `version`; graded history references the version answered.
3. The migration MUST create the response and sitting layer: `sittings` (`id`, `user_id` nullable, `exam_id`, `mode` `exam`|`practice`, `question_set` jsonb of `{item_id, item_version}` in served order, `started_at`, `submitted_at`, `score_pct`, `passed`, `breakdown` jsonb) and `item_responses` (`sitting_id`, `item_id`, `item_version`, `selected_key`, `is_correct`, `answered_at`, `elapsed_ms`). Every graded answer MUST insert an `item_responses` row - this table is the IRT calibration feed the doc requires ("capture every response").
4. The migration MUST create `users` (`id` uuid, `email` citext unique, `pin_hash`, `created_at`) as the durable identity anchor for the existing email+PIN scheme, and scaffold tables for Phase 3: `entitlements` (`user_id`, `sku`, `exam_id` nullable meaning all-access, `status`, `source`, `starts_at`, `ends_at` nullable) and `prices` (`sku`, `exam_id` nullable, `tier` `tier1`|`tier2`, `currency` char(3), `amount_minor` bigint, `active`). Monetary amounts MUST be bigint minor units - float money types are prohibited.
5. RLS MUST be enabled on every new table with no anon or authenticated policies, matching the repo's established trusted-server pattern: all reads and writes flow through API routes using the service-role client (`supabaseAdmin`). The RLS migration MUST include a guard assertion (DO block) that fails if any new table has RLS disabled, and the integration tests MUST prove the anon key can neither read nor write any new table.
6. `scripts/seed-catalog.mjs` MUST import the existing CCAF bank (`questions.server.ts`, `sampleQuestions.ts`) and its provenance records (`provenance.ccaf.json`) into the new tables under vendor `anthropic`, certification `claude-architect`, exam `ccaf`, mapping current domains via `src/lib/domains.ts`. The seed MUST be idempotent (upsert on natural keys; re-running produces zero diff) and MUST fail loudly if any item lacks a provenance record.
7. A server data-access layer MUST be introduced: `src/lib/catalog.ts` (list vendors/certs/exams, exam-by-code with domains) and `src/lib/sittings.ts` (assemble a sitting, record responses, grade). Components and routes MUST NOT query these tables directly with ad-hoc clients; the layer is the single query surface.
8. Sitting assembly (`sittings.ts`) MUST select items server-side (scored items only for `exam` mode; canaries excluded per task-SEC-001's rule; beta items mixed in unscored per the doc's beta-fielding design, marked internally but indistinguishable in the client payload), persist the served `question_set` with item versions, and return question payloads WITHOUT `correct_key` and WITHOUT `explanations`. Grading MUST reuse the persisted `question_set` so resumed or re-submitted sittings grade against exactly what was served.
9. New serving endpoints MUST exist and be rate-limited via task-SEC-001's classes: `GET /api/catalog` (`read`) and `POST /api/exams/[code]/session` (`write`). The existing grade route MUST gain (behind an env flag, default off until task-DATA-002 cutover) a DB-backed path that writes `sittings` + `item_responses` while preserving its current response contract byte-compatibly.
10. `src/core/database.types.ts` MUST be regenerated from the new schema and the codebase MUST compile against it; hot query paths (`items(exam_id, item_status)`, `item_responses(item_id)`, `sittings(user_id, exam_id)`, `entitlements(user_id, status)`) MUST have covering indexes in the migration.
11. This task MUST NOT switch user-facing reads to the DB (the app keeps serving from files until task-DATA-002's cutover), MUST NOT change any public URL, and MUST NOT implement entitlement enforcement or pricing logic (`entitlements`/`prices` are scaffolds consumed by task-PAY-001).
12. The migration MUST be reversible (paired down migration or documented irreversibility per table) and MUST apply cleanly to a fresh local Supabase stack in CI.

## §2 - Why this design

**Why keep the trusted-server RLS pattern instead of per-user policies (§1 #5)?** The repo already runs deny-all RLS with service-role API routes for every existing table, and the identity primitive (email+PIN) is not a Supabase Auth session, so `auth.uid()` policies have nothing to bind to. Deny-all + server shaping also solves the column-security problem: `correct_key` and premium `explanations` never leave the server because response shaping happens in one code path, not because of fragile column grants.

**Why item versioning + question_set persistence (§1 #2, #3, #8)?** IRT calibration (the doc's §D step 6) is only valid if a response provably refers to the item text as served. Editing an item in place would silently corrupt every historical response; version pinning makes the response stream append-only truth. Persisting the served set also makes grading deterministic under resume - the current file-based flow already learned this lesson with its server-graded checkpoint design.

**Why capture beta items in assembly now (§1 #8)?** The doc's content engine fields items as unscored beta alongside scored items ("this mirrors how AWS itself beta-tests every question"). Baking the distinction into assembly and scoring now means CONTENT-002 ships items into a pipeline that already knows how to field them; retrofitting unscored mixing after monetization would touch grading, a high-risk surface.

**Why scaffold entitlements/prices here (§1 #4, #11)?** PAY-001 needs the tables to exist before it can enforce anything, and the doc's data model names them as core entities. Creating them in the foundation migration avoids a second schema-churn cycle on tables that sittings will foreign-key against. Enforcement logic stays out - schema is cheap to carry, behavior is not.

**Why bigint minor units (§1 #4)?** Currency-decimal floats corrupt sums and comparisons; the authoring discipline mandates BIGINT minor with currency-aware decimals, and PPP pricing (tier1/tier2 per currency) multiplies the rounding surface.

**Why an idempotent, provenance-gated seed (§1 #6)?** The seed will run in CI, locally, and against production during DATA-002 rehearsals - idempotency makes it a safe fixture instead of a one-shot script. Refusing to seed unprovenanced items makes CONTENT-001's coverage gate hold in the DB world too.

## §3 - Contract

```sql
-- 20260801000000_platform_schema.sql (shape; full DDL in implementation)
create table vendors        (id uuid primary key default gen_random_uuid(), key text unique not null, name text not null);
create table certifications (id uuid primary key default gen_random_uuid(), vendor_id uuid not null references vendors, key text not null, name text not null, unique(vendor_id, key));
create table exams          (id uuid primary key default gen_random_uuid(), certification_id uuid not null references certifications,
                             code text unique not null, name text not null, version text not null,
                             blueprint_doc text not null, status text not null check (status in ('draft','live','retired')),
                             pass_threshold_pct int not null, question_count int not null, duration_minutes int not null);
create table domains        (id uuid primary key default gen_random_uuid(), exam_id uuid not null references exams, key text not null,
                             name text not null, weight_pct numeric(5,2) not null, sort int not null, unique(exam_id, key));
create table objectives     (id uuid primary key default gen_random_uuid(), domain_id uuid not null references domains, text text not null, sort int not null);
create table items          (id uuid primary key default gen_random_uuid(), exam_id uuid not null references exams,
                             domain_id uuid not null references domains, objective_id uuid references objectives,
                             stem text not null, options jsonb not null, correct_key text not null,
                             explanations jsonb, item_status text not null check (item_status in ('beta','scored','retired','canary')),
                             provenance jsonb not null, version int not null default 1,
                             created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table users          (id uuid primary key default gen_random_uuid(), email citext unique not null, pin_hash text not null, created_at timestamptz not null default now());
create table sittings       (id uuid primary key default gen_random_uuid(), user_id uuid references users, exam_id uuid not null references exams,
                             mode text not null check (mode in ('exam','practice')), question_set jsonb not null,
                             started_at timestamptz not null default now(), submitted_at timestamptz,
                             score_pct numeric(5,2), passed boolean, breakdown jsonb);
create table item_responses (id bigint generated always as identity primary key, sitting_id uuid not null references sittings,
                             item_id uuid not null references items, item_version int not null,
                             selected_key text, is_correct boolean not null, answered_at timestamptz not null default now(), elapsed_ms int);
create table entitlements   (id uuid primary key default gen_random_uuid(), user_id uuid not null references users, sku text not null,
                             exam_id uuid references exams, status text not null check (status in ('active','expired','revoked')),
                             source text not null, starts_at timestamptz not null, ends_at timestamptz);
create table prices         (id uuid primary key default gen_random_uuid(), sku text not null, exam_id uuid references exams,
                             tier text not null check (tier in ('tier1','tier2')), currency char(3) not null,
                             amount_minor bigint not null check (amount_minor >= 0), active boolean not null default true,
                             unique(sku, tier, currency));
-- covering indexes: items(exam_id, item_status); item_responses(item_id); item_responses(sitting_id);
-- sittings(user_id, exam_id); entitlements(user_id, status);
```

```typescript
// src/lib/catalog.ts (service-role, server-only)
export function listCatalog(): Promise<VendorWithCerts[]>;
export function examByCode(code: string): Promise<ExamDetail | null>; // includes domains, live only

// src/lib/sittings.ts
export function assembleSitting(input: {
  examCode: string;
  mode: 'exam' | 'practice';
  userId?: string;
}): Promise<{ sittingId: string; questions: ServedQuestion[] }>; // ServedQuestion: no correct_key, no explanations
export function recordResponse(
  sittingId: string,
  itemId: string,
  selectedKey: string,
  elapsedMs: number
): Promise<void>;
export function gradeSitting(sittingId: string): Promise<GradeResult>; // grades against persisted question_set
```

```text
GET  /api/catalog                    read-class rate limit; live exams only
POST /api/exams/[code]/session       write-class; returns sitting + questions (no answers)
Env flag DB_GRADE_PATH=off|shadow|on gates the grade route's DB writes (cutover control for DATA-002)
```

## §4 - Acceptance criteria

1. **Migration applies clean** - `supabase db reset` on a fresh local stack applies both migrations without error; all tables, checks, and indexes exist (traces_to: §1 #1, #2, #3, #4, #10, #12).
2. **RLS locked** - Every new table has RLS enabled with zero anon/authenticated policies; the DO-block guard passes; anon-key reads and writes fail on every table in the integration test (traces_to: §1 #5).
3. **Seed is complete and idempotent** - After seeding, DB item count equals file bank count, every item carries provenance jsonb, and a second run produces zero row changes; seeding with one provenance record removed fails loudly (traces_to: §1 #6).
4. **No answer leakage in serving** - `POST /api/exams/ccaf/session` payload contains stems and options for the configured question count and contains no `correct_key` and no `explanations` anywhere in the JSON (deep scan) (traces_to: §1 #8, #9).
5. **Version-pinned grading** - Editing an item (version bump) after a sitting is assembled does not change that sitting's grade; grading uses the persisted `question_set` versions (traces_to: §1 #2, #8).
6. **Responses captured** - Grading a sitting inserts one `item_responses` row per served question with `item_version`, `is_correct`, and timing fields populated (traces_to: §1 #3).
7. **Assembly rules hold** - `exam` mode selects only `scored` items plus unscored `beta` mixing per config; `canary` and `retired` never appear in exam mode; beta items are excluded from `score_pct` (traces_to: §1 #8).
8. **Money is bigint** - `prices.amount_minor` rejects negatives via check constraint; no float/numeric money column exists in entitlement/price tables (schema assertion) (traces_to: §1 #4).
9. **Layer is the only query surface** - grep/import-graph test: no `src/app/**` file creates a Supabase client against the new tables directly; all access goes through `catalog.ts`/`sittings.ts` (traces_to: §1 #7).
10. **Endpoints rate-limited** - New routes classify as `read`/`write` in SEC-001's `classify()`; unit test asserts the mapping (traces_to: §1 #9).
11. **Grade route contract preserved** - With `DB_GRADE_PATH=shadow`, the grade route's HTTP response is byte-identical to the current contract while sittings/responses rows land; with `off`, no DB writes occur (traces_to: §1 #9, #11).
12. **Types regenerate and compile** - `database.types.ts` regenerated; `npm run build` passes (traces_to: §1 #10).
13. **No user-facing switch** - Exam/practice pages still serve from files in this task's diff; no public URL changes (traces_to: §1 #11).

## §5 - Verification

```typescript
// tests/integration/schema.test.ts (vitest, runs against local supabase stack in CI)
test('migrations apply on fresh stack; tables + indexes present'); // AC 1
test('RLS enabled everywhere; anon read/write denied per table'); // AC 2
test('prices: negative amount_minor rejected; money columns are bigint'); // AC 8
test('seed: counts match, provenance required, idempotent second run'); // AC 3

// tests/integration/serving.test.ts
test('session payload has no correct_key/explanations (deep key scan)'); // AC 4
test('grade uses persisted question_set across item version bump'); // AC 5
test('item_responses rows written per graded question'); // AC 6
test('exam-mode assembly: scored+beta only, canary/retired excluded, beta unscored'); // AC 7
test('grade route shadow mode: byte-identical response + rows written; off: no writes'); // AC 11
test('grep: new tables accessed only via catalog.ts/sittings.ts'); // AC 9
test('rate-limit classify covers new routes'); // AC 10
```

```bash
# AC 12: npx supabase gen types typescript --local > src/core/database.types.ts && npm run build
# AC 13: route-folder diff check in review (manual verification - justified: "no user-facing
#        switch" is a diff property; reviewer confirms exam/practice pages' imports unchanged)
```

## §6 - Implementation skeleton

Schema migration -> RLS migration with guard -> local stack green -> seed script (reads file bank + provenance, upserts catalog spine then items) -> types regen -> catalog.ts/sittings.ts -> serving endpoints + rate-limit classes -> grade-route shadow path behind env flag -> integration tests. Keep `sittings.ts` free of HTTP concerns so DATA-002 can reuse assembly/grading for the cutover and PAY-001 can wrap entitlement checks around it.

## §7 - Dependencies

- Upstream: task-CONTENT-001's provenance records feed the seed gate (soft: the seed refuses without them - sequence CONTENT-001 first as the backlog does); task-SEC-001's rate-limit classes are consumed (soft: classes exist by P0 exit).
- Downstream: task-DATA-002 (user-data migration + cutover) builds directly on this schema and the shadow grade path; task-CONTENT-002 writes generated items + provenance into `items`; task-PAY-001 enforces `entitlements`/`prices`; blocks edges recorded in frontmatter.
- External: Supabase project (existing); local Supabase CLI stack in CI.

## §8 - Example payloads

```json
// POST /api/exams/ccaf/session response (truncated)
{
  "sittingId": "6a4f...",
  "examCode": "ccaf",
  "durationMinutes": 90,
  "questions": [
    {
      "id": "b1c2...",
      "domain": "agent-architecture",
      "stem": "A team needs...",
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." }
      ]
    }
  ]
}
```

```json
// item_responses row
{
  "sitting_id": "6a4f...",
  "item_id": "b1c2...",
  "item_version": 1,
  "selected_key": "B",
  "is_correct": false,
  "elapsed_ms": 41250
}
```

## §9 - Open questions

Deferred:

- Full account auth (passwords/OAuth via Supabase Auth) is deliberately out: the email+PIN scheme survives Phase 1 unchanged, and an auth upgrade is its own future task once monetization demands it (PAY-001 §9 revisits). The `users` table is shaped so Supabase Auth can be adopted without rekeying.
- Beta-mix ratio in exam mode (how many unscored items per sitting) is CONTENT-002's psychometric call; assembly takes it as exam config with default 0 until then.
- Read-replica / Neon contingency from the doc's §F stays a scaling trigger, not built now.

## §10 - Failure modes inventory

| Failure                                              | Detection                                                                          | Outcome                         | Recovery                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| correct_key leaks through a new endpoint             | AC 4 deep-scan test pattern applied to every serving route                         | Answer key scraped              | Response shaping lives in sittings.ts only (AC 9)         |
| New table added later without RLS                    | DO-block guard pattern + AC 2 test enumerates via pg_catalog, not a hardcoded list | Open table                      | Guard fails migration                                     |
| In-place item edit corrupts historical responses     | Version pinning (AC 5)                                                             | Bad IRT data, wrong regrades    | version bump rule + question_set persistence              |
| Seed double-run duplicates items                     | Idempotency test (AC 3)                                                            | Duplicate bank                  | Natural-key upserts                                       |
| Unprovenanced item enters DB                         | Seed gate (AC 3); CONTENT-002 pipeline emits records                               | Contamination defense hole      | provenance not-null + gate                                |
| Float money sneaks in later                          | Schema assertion test (AC 8) scans column types                                    | Rounding corruption             | bigint rule is tested, not conventional                   |
| Beta items scored by accident                        | AC 7 scoring exclusion test                                                        | Learner harm, dirty calibration | question_set marks scored flag server-side                |
| Canary served in exam mode                           | AC 7                                                                               | Unfair result                   | assembly filter                                           |
| item_responses growth (100 rows/sitting) bloats DB   | Index plan + bigint identity PK; volume noted for ops                              | Slow queries, cost              | Partition/archive when volume justifies (scaling trigger) |
| Grade route contract drift breaks live clients       | AC 11 byte-compat shadow test                                                      | Broken exam submissions         | Shadow mode + contract test before cutover                |
| Ad-hoc Supabase queries bypass the layer             | AC 9 import-graph grep                                                             | Divergent shaping, leaks        | Single query surface rule                                 |
| Migration irreversible without note                  | AC 1 + §1 #12 reversibility requirement                                            | Stuck rollback during DATA-002  | Paired down-migration or documented exception             |
| jsonb options/breakdown shape drifts between writers | Typed layer is the only writer (AC 9); types regen (AC 12)                         | Parse errors                    | Zod-parse at layer boundaries                             |

## §11 - Implementation notes

- `citext` for email needs the extension enabled in the migration; Supabase ships it.
- The DO-block RLS guard should query `pg_tables`/`pg_class` for the migration's schema additions and raise on any `relrowsecurity = false` - enumerate dynamically so the guard covers future tables added to the same migration file.
- Keep `ServedQuestion` shaping as a pure function from a DB row - it is the one function where forgetting a field means leaking an answer key; give it its own exhaustive unit test (pick-list, not omit-list: build the payload from allowed fields, never by deleting keys).
- The env-flagged shadow grade path is the keystone for DATA-002's zero-downtime story: production can dual-write and be verified for days before any read path moves. Do not skip `shadow` and jump to `on`.
- `pass_threshold_pct`, `question_count`, `duration_minutes` for CCAF seed from the current site's live values - they are config observed in the repo, not invented.

_End of task-DATA-001._
