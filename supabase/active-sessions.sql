-- Cross-device resume checkpoints for in-progress exam sittings.
--
-- Written only for identified users (those who set an email + PIN on the start screen). The row
-- holds a small snapshot of the active sitting - question ids, chosen letters, current position, and
-- the timer - never the answer key. Written by the server via the service-role key only (see
-- src/app/api/session/route.ts and src/lib/supabaseAdmin.ts), the same trusted-write pattern as the
-- leaderboard and subscribers. Row Level Security is on with no anon policy, so the public key can
-- neither read nor write this table. A load returns the row only when the supplied pin_hash matches
-- (enforced in the route). Run this once in the Supabase SQL editor.

create table if not exists public.active_exam_sessions (
  email      text primary key,
  pin_hash   text not null,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.active_exam_sessions enable row level security;
-- Intentionally no policies for anon/authenticated: only the service role (which bypasses RLS) can
-- read or write. The upsert relies on ON CONFLICT (email), provided by the primary key.

-- Optional housekeeping: run occasionally to drop abandoned checkpoints older than 30 days.
--   delete from public.active_exam_sessions where updated_at < now() - interval '30 days';
