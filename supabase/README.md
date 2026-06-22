# Supabase

The exam's authoritative scoring and stats live in Postgres RPC functions, not in
this codebase. The app calls these (reads via `src/lib/api.ts`; the timed write goes
through the server route `src/app/api/exam/grade/route.ts`):

- `get_global_stats()` - leaderboard and global numbers (returns
  `total_exams`, `avg_score`, `pass_rate`, `hardest_questions[]`, `leaderboard[]`).
- `get_user_history(p_email text, p_pin_hash text)` - a signed-in user's attempts.
- `submit_exam_result(p_email, p_pin_hash, p_score, p_wrong_answers, p_time_taken, p_nickname)` -
  records a finished timed attempt. The score is computed on the server in the grade route,
  not supplied by the client, and EXECUTE is locked to `service_role` by
  `migrations/20260622090000_lock_submit_exam_result.sql` (see "Locking the write path").
- `verify_mock_user(...)` - referenced historically for the email and PIN check.

These functions are currently un-versioned: the only copy is in the live database.
If they are edited in the dashboard, or the project is ever recreated, there is no
record of the logic that decides every score. Versioning them into
`supabase/migrations/` fixes that.

## How to version them (one time)

The function bodies are not guessed here on purpose - a wrong body applied as a
migration would overwrite working logic. Capture the real definitions first.

Option A, with the Supabase CLI (preferred):

    supabase link --project-ref <your-project-ref>
    supabase db pull            # writes the current schema, incl. functions, to supabase/migrations/

Option B, from the SQL editor: run `supabase/capture-rpcs.sql`, copy the output,
and save it as `supabase/migrations/0001_scoring_rpcs.sql`.

After that, commit the generated migration. From then on, change the functions by
adding a new migration rather than editing them live, so the scoring logic is always
traceable in git.

## Locking the write path (leaderboard integrity)

`submit_exam_result` writes scores. It used to be callable by the anon role, so the public
anon key could insert any score directly, bypassing the app - the root cause of the wall of
perfect 1000s. The migration `migrations/20260622090000_lock_submit_exam_result.sql` revokes
that and grants EXECUTE only to `service_role`. The app keeps writing because the grade route
uses a server-only service-role client (`src/lib/supabaseAdmin.ts`); reads are unchanged.

Required environment variable (server only, never `NEXT_PUBLIC_`):

    SUPABASE_SERVICE_ROLE_KEY=<the project's service_role key from Supabase, Settings > API>

Rollout order - follow it, or scores stop saving in the gap:

1. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel and deploy. The grade route then writes via the
   service role.
2. Run the migration in the SQL editor.
3. Optional, only after the above is live: clear the old injected scores with
   `cleanup-leaderboard.sql` (and a truncate if you want a fresh leaderboard).
