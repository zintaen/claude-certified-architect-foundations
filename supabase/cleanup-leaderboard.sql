-- Leaderboard hygiene for the CCA-F mock.
--
-- The live leaderboard is dominated by perfect 1000 scores because, before the
-- staged integrity fix, anyone could call submit_exam_result with the public anon
-- key and any score. Run these in the Supabase SQL editor. Steps 1 and 2 are
-- read-only; review the output before running 3 to 5.

-- 1) See what submit_exam_result writes to (note the target table and score column).
select pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'submit_exam_result';

-- 2) Inspect the score distribution. Replace <results_table> and <score_col> with
--    the table and column from step 1.
-- select <score_col>, count(*) from public.<results_table> group by 1 order by 1 desc;

-- 3) Remove impossible scores (outside 0..1000). Unambiguous and safe.
-- delete from public.<results_table> where <score_col> < 0 or <score_col> > 1000;

-- 4) Stop impossible scores at the source so they can never be inserted again.
-- alter table public.<results_table>
--   add constraint <results_table>_score_range check (<score_col> between 0 and 1000);

-- 5) Optional fresh start. A legitimate perfect score cannot be told apart from an
--    injected one by SQL alone, so if you want the wall of 1000s gone, reset the
--    leaderboard only AFTER stage 2 (server-side grading) is live:
-- truncate public.<results_table>;
--    A reset drops the social-proof totals on the landing page, so do it once new
--    scores are trustworthy.

-- Worth confirming once: Row Level Security is on for the results and bug_reports
-- tables, and the anon role can only INSERT there (reads go through the
-- SECURITY DEFINER RPCs), e.g.:
-- select relname, relrowsecurity from pg_class where relname in ('bug_reports');
