-- DATA-002: idempotent migration journal (source row → target id)
create table if not exists public.migration_log (
  source_table text not null,
  source_key text not null,
  target_table text not null,
  target_id uuid not null,
  migrated_at timestamptz not null default now(),
  primary key (source_table, source_key)
);

create index if not exists migration_log_target_idx
  on public.migration_log (target_table, target_id);

alter table public.migration_log enable row level security;
-- service-role only (no anon policies)
