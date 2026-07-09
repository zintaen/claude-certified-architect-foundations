-- Cross-device exam result breakdowns.
--
-- Stores the full server-graded breakdown of a finished sitting for identified users (those who set
-- an email + PIN on the start screen), keyed by (email, session_id). This is what lets the dashboard
-- reopen a breakdown on ANY device, not only the one the exam was taken on. Each row holds only that
-- user's own graded result - the same object the result page already renders - never the full answer
-- key for the whole question bank.
--
-- Written by the server via the service-role key only (see src/app/api/exam/grade/route.ts and
-- src/lib/supabaseAdmin.ts), the same trusted-write pattern as the leaderboard, subscribers, and the
-- resume checkpoint. Row Level Security is on with no anon policy, so the public key can neither read
-- nor write this table. Reads go through /api/result and return a row only when the supplied pin_hash
-- matches. Run this once in the Supabase SQL editor.

create table if not exists public.exam_results (
  email        text not null,
  session_id   text not null,
  pin_hash     text not null,
  score        int not null,
  passed       boolean not null,
  time_sec     int not null,
  untimed      boolean not null default false,
  breakdown    jsonb not null,
  completed_at timestamptz not null default now(),
  primary key (email, session_id)
);

alter table public.exam_results enable row level security;
-- Intentionally no policies for anon/authenticated: only the service role (which bypasses RLS) can
-- read or write. The upsert relies on ON CONFLICT (email, session_id), provided by the primary key.

-- Fast "most recent first" listing per user for the dashboard.
create index if not exists exam_results_email_completed_idx
  on public.exam_results (email, completed_at desc);

-- Optional housekeeping: run occasionally to drop breakdowns older than a year.
--   delete from public.exam_results where completed_at < now() - interval '365 days';
