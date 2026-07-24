-- Deny-all RLS for platform tables (task-DATA-001).
-- Trusted-server pattern: service-role bypasses RLS; anon/authenticated get zero policies.

alter table public.vendors enable row level security;
alter table public.certifications enable row level security;
alter table public.exams enable row level security;
alter table public.domains enable row level security;
alter table public.objectives enable row level security;
alter table public.items enable row level security;
alter table public.users enable row level security;
alter table public.sittings enable row level security;
alter table public.item_responses enable row level security;
alter table public.entitlements enable row level security;
alter table public.prices enable row level security;

-- Guard: fail if any platform table has RLS disabled.
do $$
declare
  bad text;
begin
  select c.relname
    into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any (array[
      'vendors','certifications','exams','domains','objectives','items',
      'users','sittings','item_responses','entitlements','prices'
    ])
    and c.relrowsecurity is not true
  limit 1;

  if bad is not null then
    raise exception 'RLS guard failed: public.% has row level security disabled', bad;
  end if;
end $$;
