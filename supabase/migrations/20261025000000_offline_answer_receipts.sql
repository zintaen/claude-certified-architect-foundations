-- SCALE-002: idempotent offline answer receipts (client_id dedupe).
create table if not exists public.offline_answer_receipts (
  client_id text primary key,
  email text,
  pin_hash text,
  sitting_id text not null,
  item_id text not null,
  selected_key text not null,
  elapsed_ms integer default 0,
  queued_at timestamptz,
  exam_code text,
  created_at timestamptz not null default now()
);

create index if not exists offline_answer_receipts_email_idx
  on public.offline_answer_receipts (email);

alter table public.offline_answer_receipts enable row level security;
