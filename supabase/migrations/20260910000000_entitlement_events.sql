-- PAY-001: append-only entitlement audit trail.
-- Current-state truth remains public.entitlements; events are history.

create table if not exists public.entitlement_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  sku text not null,
  exam_id uuid references public.exams (id),
  kind text not null check (kind in ('granted', 'expired', 'revoked', 'adjusted')),
  source text not null,
  actor text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists entitlement_events_user_idx
  on public.entitlement_events (user_id, created_at desc);

alter table public.entitlement_events enable row level security;
-- Deny-all RLS (no anon/authenticated policies) — service role only via grants.

grant select, insert on public.entitlement_events to service_role;
-- Append-only: no UPDATE/DELETE for any role used by the app.
revoke update, delete on public.entitlement_events from anon, authenticated, service_role;

grant usage, select on sequence public.entitlement_events_id_seq to service_role;
