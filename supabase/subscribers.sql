-- Newsletter / marketing opt-in list for the CCA-F mock.
--
-- Written only by the server via the service-role key (see src/app/api/subscribe/route.ts and
-- src/lib/supabaseAdmin.ts), the same trusted-write pattern as the leaderboard. Row Level Security
-- is on with no anon policy, so the public key can neither read nor write this table. Run this once
-- in the Supabase SQL editor.

create table if not exists public.subscribers (
  email      text primary key,
  source     text,
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;
-- Intentionally no policies for anon/authenticated: only the service role (which bypasses RLS)
-- can read or write. The API upsert relies on ON CONFLICT (email), provided by the primary key.

-- Export your list later with:
--   select email, source, created_at from public.subscribers order by created_at desc;
