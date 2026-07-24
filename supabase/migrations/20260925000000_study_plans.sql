-- LEARN-004: versioned study plan snapshots

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  exam_code text not null,
  inputs jsonb not null,
  plan jsonb not null,
  plan_version integer not null default 1,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create index if not exists study_plans_user_active_idx
  on public.study_plans (user_id, exam_code, created_at desc)
  where superseded_at is null;

alter table public.study_plans enable row level security;
grant select, insert, update on public.study_plans to service_role;
