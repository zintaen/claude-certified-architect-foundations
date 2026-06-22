-- Lock the leaderboard write path at the database level.
--
-- Before this, submit_exam_result was EXECUTE-able by the anon role, so anyone holding the
-- public anon key could call it directly (bypassing the app) and insert any score. That is
-- the root cause of the wall of perfect 1000s on the leaderboard. After this migration only
-- the service_role may run it. The app now writes scores from the server using the
-- service-role key (see src/lib/supabaseAdmin.ts and src/app/api/exam/grade/route.ts), and
-- the score is computed on the server from the submitted answers, not supplied by the client.
--
-- ROLLOUT ORDER (do these in order, or score submissions will break in the gap):
--   1. Set SUPABASE_SERVICE_ROLE_KEY in the server environment (Vercel project settings,
--      NOT prefixed with NEXT_PUBLIC) and deploy the app that writes via the service-role
--      client. Do this FIRST.
--   2. Then run this migration in the Supabase SQL editor. If you run it before step 1, the
--      still-deployed app calls the RPC as anon and every submission fails until you deploy.
--
-- Idempotent: safe to run more than once, and it covers every overload of the function
-- regardless of its argument types.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_exam_result'
  loop
    execute format('revoke execute on function %s from anon, authenticated, public;', fn.sig);
    execute format('grant execute on function %s to service_role;', fn.sig);
    raise notice 'locked %', fn.sig;
  end loop;

  if not found then
    raise warning 'no function named public.submit_exam_result was found - nothing to lock';
  end if;
end $$;

-- Verification (run separately). The anon and authenticated roles should NOT appear as
-- grantees; only service_role (and the owner) should.
--   select p.proname, coalesce(r.rolname, 'PUBLIC') as grantee, a.privilege_type
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   left join lateral aclexplode(p.proacl) a on true
--   left join pg_roles r on r.oid = a.grantee
--   where n.nspname = 'public' and p.proname = 'submit_exam_result';
--
-- Note: the read RPCs (get_global_stats, get_user_history) intentionally remain
-- anon-executable - they are reads behind SECURITY DEFINER functions. Only the write path
-- (submit_exam_result) is locked here.
