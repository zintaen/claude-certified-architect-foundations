-- item_reviews + item_stats for CONTENT-002 pipeline
-- item_reviews.item_ref is deliberately NOT an FK to items: rejected drafts
-- never enter items, but their review trail must persist (CONTENT-002 §11).

create table if not exists public.item_reviews (
  id uuid primary key default gen_random_uuid(),
  item_ref uuid not null,
  reviewer text not null,
  verdict text not null check (verdict in ('approved', 'rejected', 'revise')),
  notes text,
  signed_at timestamptz not null default now()
);

create index if not exists item_reviews_ref_signed_idx
  on public.item_reviews (item_ref, signed_at desc);

create table if not exists public.item_stats (
  item_id uuid not null references public.items (id) on delete cascade,
  computed_at timestamptz not null default now(),
  response_count int not null,
  p_value numeric(6, 4),
  point_biserial numeric(6, 4),
  irt_a numeric,
  irt_b numeric,
  primary key (item_id, computed_at)
);

create index if not exists item_stats_item_idx on public.item_stats (item_id);

-- Exam-level beta mix consumed by DATA-001 assembly
alter table public.exams
  add column if not exists beta_mix_ratio numeric(5, 2) not null default 0;

alter table public.item_reviews enable row level security;
alter table public.item_stats enable row level security;

-- Trusted-server pattern: service_role only (matches DATA-001 deny-all RLS).
grant all on table public.item_reviews, public.item_stats to service_role;
revoke all on table public.item_reviews, public.item_stats from anon, authenticated;

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
    and c.relname = any (array['item_reviews', 'item_stats'])
    and c.relrowsecurity is not true
  limit 1;
  if bad is not null then
    raise exception 'RLS guard failed: public.% has row level security disabled', bad;
  end if;
end $$;
