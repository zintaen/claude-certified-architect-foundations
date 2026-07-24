-- GROWTH-004: community explanations (human-moderated UGC)

create table if not exists public.community_explanations (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  item_version integer not null default 1,
  author_user_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'removed')),
  moderation_note text,
  flag_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One pending submission per user per item
create unique index if not exists community_explanations_one_pending
  on public.community_explanations (author_user_id, item_id)
  where status = 'pending';

create index if not exists community_explanations_item_approved_idx
  on public.community_explanations (item_id, status, created_at desc);

create table if not exists public.explanation_votes (
  explanation_id uuid not null references public.community_explanations (id) on delete cascade,
  voter_user_id uuid not null references public.users (id) on delete cascade,
  value smallint not null default 1 check (value = 1),
  created_at timestamptz not null default now(),
  primary key (explanation_id, voter_user_id)
);

-- Contamination / AUP flags into CONTENT-001 disposition path
create table if not exists public.community_item_flags (
  id bigint generated always as identity primary key,
  item_id text not null,
  explanation_id uuid references public.community_explanations (id) on delete set null,
  reason text not null,
  aup_cite text not null default 'acceptable-use: content integrity / dumps',
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists community_item_flags_open_idx
  on public.community_item_flags (status, created_at desc);

alter table public.community_explanations enable row level security;
alter table public.explanation_votes enable row level security;
alter table public.community_item_flags enable row level security;

grant select, insert, update on public.community_explanations to service_role;
grant select, insert, delete on public.explanation_votes to service_role;
grant select, insert, update on public.community_item_flags to service_role;

grant usage, select on sequence public.community_item_flags_id_seq to service_role;
