-- LEARN-003: spaced-repetition review cards (FSRS state)

create table if not exists public.review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  card_kind text not null check (card_kind in ('item', 'flashcard')),
  card_ref text not null,
  exam_code text not null default 'ccaf',
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  state text not null default 'new'
    check (state in ('new', 'learning', 'review', 'relearning')),
  due_at timestamptz not null default now(),
  last_review_at timestamptz,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_kind, card_ref)
);

create index if not exists review_cards_due_idx
  on public.review_cards (user_id, due_at)
  where suspended = false;

alter table public.review_cards enable row level security;

grant select, insert, update on public.review_cards to service_role;
