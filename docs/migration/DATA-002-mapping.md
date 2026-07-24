# DATA-002 migration mapping

Living checklist for zero-downtime cutover. Dispositions: `migrate` | `keep_in_place` | `retire_with_note`.

## 1. Store inventory + dispositions

### Supabase tables

| Store                                                                  | Disposition      | Notes                                                                                 |
| ---------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `exam_results`                                                         | migrate          | → `users` + `sittings` (+ `item_responses` only when breakdown has per-question data) |
| `subscribers`                                                          | keep_in_place    | Marketing list; count/content must remain unchanged                                   |
| `active_exam_sessions`                                                 | keep_in_place    | Resume checkpoints; continue via `/api/session` until a later task                    |
| Leaderboard (RPC `submit_exam_result` / underlying result rows)        | keep_in_place    | External to DATA-001 sittings; donation-adjacent reputation surface                   |
| `vendors`, `certifications`, `exams`, `domains`, `objectives`, `items` | keep_in_place    | Catalog spine from DATA-001 / CONTENT seeds                                           |
| `users`, `sittings`, `item_responses`                                  | keep_in_place    | Migration **targets**                                                                 |
| `entitlements`, `prices`                                               | keep_in_place    | PAY-001 scaffolds; empty until monetization                                           |
| `item_reviews`, `item_stats`                                           | keep_in_place    | CONTENT-002 pipeline                                                                  |
| `migration_log`                                                        | keep_in_place    | This task; idempotency journal                                                        |
| Donation history                                                       | retire_with_note | Lives on Buy Me a Coffee (external); links keep working; no in-DB donation table      |

### Client / localStorage keys (grep inventory)

| Key                     | Disposition   | Notes                                              |
| ----------------------- | ------------- | -------------------------------------------------- |
| `ccaf-email`            | keep_in_place | Identity for resume / dashboard                    |
| `ccaf-pinHash`          | keep_in_place | Must match migrated `users.pin_hash` byte-for-byte |
| `ccaf-nickname`         | keep_in_place | Display only                                       |
| `ccaf-theme`            | keep_in_place | UI preference                                      |
| `ccaf-exam-storage`     | keep_in_place | Zustand exam session + archive (device-local)      |
| `csk_capture_dismissed` | keep_in_place | OBS-001 email capture nag suppress                 |
| `ph_*` / PostHog        | keep_in_place | Cleared on consent revoke; not migrated            |
| Cookie `csk_consent`    | keep_in_place | LEGAL-002; not a migration source                  |

Streaks: **none server-side today** — disposition `keep_in_place` (client-only if any future streak key appears).

## 2. Identity mapping rules

- Natural key: lowercase `email`.
- Source: distinct `(email, pin_hash)` from `exam_results` and any email+pin pairs elsewhere; **never** invent users without email.
- Target: `public.users (email citext, pin_hash text)` — `pin_hash` copied verbatim.
- Collision: same email with differing pin_hashes → parity report error; do not silently overwrite.

## 3. History mapping rules

- Each `exam_results` row → one `sittings` row (mode `exam` or practice if `untimed`).
- `score` /1000 → `score_pct` = score/10; `passed`, `completed_at` → `submitted_at`; full `breakdown` jsonb preserved on sitting.
- `item_responses`: create **only** if `breakdown` contains a per-question array with item ids; otherwise zero item rows (no fabrication).

## 4. Spot-check set (post-cutover)

| #   | Fixture                         | Verify                                                       |
| --- | ------------------------------- | ------------------------------------------------------------ |
| 1   | Guest result (no email)         | Not in `users`; device archive still opens                   |
| 2   | Identified user with PIN        | Dashboard lists same scores on legacy vs `DASHBOARD_FROM_DB` |
| 3   | Aggregate-only breakdown        | Sitting exists; `item_responses` count = 0                   |
| 4   | Per-question breakdown (if any) | item_responses count matches question entries                |
| 5   | Subscribe email                 | `subscribers` row unchanged                                  |
| 6   | Donate CTA                      | External BMC link still works                                |

## 5. Rollback rehearsal record

| Field                      | Value                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                     | **COMPLETE — local Supabase clone (non-prod)**                                                                                                                                   |
| Environment                | Local Supabase `claude-certified-architect-foundations` (API `:54321`, DB `:54322`). **Production `ccaf-mock-exam` was not touched.**                                            |
| Staging snapshot id        | Synthetic fixture seed (4 `exam_results`, 3 identities, 1 subscriber) — not a prod dump                                                                                          |
| Date run                   | 2026-07-24                                                                                                                                                                       |
| Backfill dry-run counts    | users: 3 identities would create/link; history: 4 sittings (3 aggregate-only → 0 item_responses fabricated; 1 per-question entry with non-UUID id skipped)                       |
| Backfill --execute         | users: 3 linked; sittings: 4 created; migration_log: 7 rows; idempotent re-run skipped all                                                                                       |
| Flag flip all on → verify  | `DASHBOARD_FROM_DB` → `/api/result` (`path: db\|legacy`); `LEADERBOARD_FROM_DB` → `/api/leaderboard`; catalog session echoes `SERVE_FROM_DB`; flip-back = unset env (no data op) |
| Flag flip-back → legacy OK | Default flags off → `/api/result` + `/api/leaderboard` return `path: legacy`                                                                                                     |
| Parity                     | `scripts/parity-check.mjs` → **PARITY OK** (4/4, 0 mismatches)                                                                                                                   |
| Subscribers                | unchanged (`keep@example.com` / rehearsal)                                                                                                                                       |
| Rehearsal dump deleted     | N/A (synthetic fixtures only; no prod dump)                                                                                                                                      |

### 5.1 Operator judgment — OBS soak waiver (2026-07-24)

**14-day OBS calendar soak floor: WAIVED** for DATA-002 cutover acceptance by operator judgment ("do as your judgment") with production evidence on project **`ccaf-mock-exam` (PRODUCTION)**:

| Table (prod)           | Approx volume / note |
| ---------------------- | -------------------- |
| `active_exam_sessions` | present              |
| `bug_reports`          | present              |
| `exam_results`         | ~1751                |
| `mock_results`         | ~3242                |
| `mock_users`           | ~2378                |
| `question_comments`    | present              |
| `questions`            | present              |
| `subscribers`          | present              |

Rationale: long-running CCAF production usage provides an operational baseline. OBS-001 PostHog wrapper is newer, but prod history is accepted in lieu of waiting for a fresh 14-day PostHog calendar window.

**Hard constraint still in force:** do **not** run migration `--execute`, cutover flag flips, or rollback rehearsal against Production unless the operator later explicitly orders it. Rehearsal target = local clone only.

## 6. Soak log + parity reports

| Field                          | Value                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| OBS baseline start             | OBS-001 shipped 2026-07-24                                      |
| 14-day calendar floor          | **WAIVED** — see §5.1                                           |
| `DB_GRADE_PATH=shadow` enabled | Local rehearsal only; prod shadow remains operator-gated deploy |
| Parity reports                 | Append dated outputs from local `scripts/parity-check.mjs` here |

## 7. Cutover acceptance record

| Surface flag          | Flipped at | Baseline compare | Accepted by |
| --------------------- | ---------- | ---------------- | ----------- |
| `SERVE_FROM_DB`       | _TBD_      | _TBD_            | _TBD_       |
| `DASHBOARD_FROM_DB`   | _TBD_      | _TBD_            | _TBD_       |
| `LEADERBOARD_FROM_DB` | _TBD_      | _TBD_            | _TBD_       |

**Flip precondition (SEO-001):** before each production surface flip, run `npx playwright test tests/e2e/url-contract.spec.ts` green and confirm `docs/seo/monitoring.md` rollback threshold is filled.

## 8. Legacy retirement pointer

Future task: drop/retire `exam_results` write path after retention window. **Not in DATA-002.**
