-- GROWTH-003: referral codes + append-only events

create table if not exists public.referrals (
  code text primary key,
  referrer_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referrer_user_id)
);

create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  code text not null references public.referrals (code),
  referred_user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('signup', 'qualified', 'rewarded', 'held')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (code, referred_user_id, kind)
);

create index if not exists referral_events_referred_idx on public.referral_events (referred_user_id);
create index if not exists referral_events_code_idx on public.referral_events (code, created_at desc);

alter table public.referrals enable row level security;
alter table public.referral_events enable row level security;

grant select, insert, update on public.referrals to service_role;
grant select, insert on public.referral_events to service_role;
revoke update, delete on public.referral_events from anon, authenticated, service_role;

grant usage, select on sequence public.referral_events_id_seq to service_role;
