-- GROWTH-005: lifecycle email send log + suppressions

create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint')),
  created_at timestamptz not null default now()
);

create table if not exists public.email_sends (
  id bigint generated always as identity primary key,
  recipient text not null,
  recipient_hash text not null,
  template text not null,
  sequence text not null,
  message_id text,
  sent_at timestamptz not null default now(),
  unique (recipient_hash, template)
);

create index if not exists email_sends_sent_idx on public.email_sends (sent_at desc);

alter table public.email_suppressions enable row level security;
alter table public.email_sends enable row level security;

grant select, insert on public.email_suppressions to service_role;
grant select, insert on public.email_sends to service_role;
revoke update, delete on public.email_sends from anon, authenticated, service_role;
revoke update, delete on public.email_suppressions from anon, authenticated, service_role;

grant usage, select on sequence public.email_sends_id_seq to service_role;
