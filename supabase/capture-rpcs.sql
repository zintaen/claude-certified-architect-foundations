-- Capture the live scoring/stats RPC definitions so they can be versioned.
-- Run this in the Supabase SQL editor, then paste the output into
-- supabase/migrations/0001_scoring_rpcs.sql (see supabase/README.md).
--
-- This is read-only: it only reads catalog metadata, it does not change anything.

select string_agg(pg_get_functiondef(p.oid), E';\n\n' order by p.proname) || ';' as migration_sql
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_global_stats',
    'get_user_history',
    'submit_exam_result',
    'verify_mock_user'
  );
