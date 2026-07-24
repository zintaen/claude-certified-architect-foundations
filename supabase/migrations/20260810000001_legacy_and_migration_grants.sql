-- Grants for legacy + migration_log tables (DATA-002 local/prod apply).
-- Mirrors 20260801000002_platform_grants.sql pattern: service_role full access;
-- anon/authenticated get table grants but RLS deny-all blocks them.

grant usage on schema public to anon, authenticated, service_role;

grant all on table
  public.exam_results,
  public.subscribers,
  public.active_exam_sessions,
  public.migration_log
to service_role;

grant select, insert, update, delete on table
  public.exam_results,
  public.subscribers,
  public.active_exam_sessions,
  public.migration_log
to anon, authenticated;
