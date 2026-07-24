-- Privileges for platform tables (task-DATA-001).
-- service_role: full access (bypasses RLS).
-- anon/authenticated: table grants exist but RLS deny-all blocks them.

grant usage on schema public to anon, authenticated, service_role;

grant all on table
  public.vendors,
  public.certifications,
  public.exams,
  public.domains,
  public.objectives,
  public.items,
  public.users,
  public.sittings,
  public.item_responses,
  public.entitlements,
  public.prices
to service_role;

grant select, insert, update, delete on table
  public.vendors,
  public.certifications,
  public.exams,
  public.domains,
  public.objectives,
  public.items,
  public.users,
  public.sittings,
  public.item_responses,
  public.entitlements,
  public.prices
to anon, authenticated;

grant usage, select on all sequences in schema public to service_role, anon, authenticated;
