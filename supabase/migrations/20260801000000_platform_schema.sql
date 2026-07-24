-- Platform schema: multi-vendor multi-exam catalog, items, sittings, responses,
-- users, and Phase-3 entitlement/price scaffolds (task-DATA-001).
-- Reversible: see companion down section at bottom (commented) / supabase db reset.

create extension if not exists citext;

-- Catalog spine
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, key)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications (id) on delete cascade,
  code text unique not null,
  name text not null,
  version text not null,
  blueprint_doc text not null,
  status text not null check (status in ('draft', 'live', 'retired')),
  pass_threshold_pct int not null,
  question_count int not null,
  duration_minutes int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  key text not null,
  name text not null,
  weight_pct numeric(5, 2) not null,
  sort int not null,
  unique (exam_id, key)
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  text text not null,
  sort int not null
);

-- Items (answer key + provenance stay server-side)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  domain_id uuid not null references public.domains (id),
  objective_id uuid references public.objectives (id),
  external_key text not null,
  stem text not null,
  options jsonb not null,
  correct_key text not null,
  explanations jsonb,
  item_status text not null check (item_status in ('beta', 'scored', 'retired', 'canary')),
  provenance jsonb not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, external_key)
);

create index if not exists items_exam_status_idx on public.items (exam_id, item_status);

-- Identity (email + PIN scheme; not Supabase Auth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

-- Sittings + responses (IRT feed)
create table if not exists public.sittings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id),
  exam_id uuid not null references public.exams (id),
  mode text not null check (mode in ('exam', 'practice')),
  question_set jsonb not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_pct numeric(5, 2),
  passed boolean,
  breakdown jsonb
);

create index if not exists sittings_user_exam_idx on public.sittings (user_id, exam_id);

create table if not exists public.item_responses (
  id bigint generated always as identity primary key,
  sitting_id uuid not null references public.sittings (id) on delete cascade,
  item_id uuid not null references public.items (id),
  item_version int not null,
  selected_key text,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  elapsed_ms int
);

create index if not exists item_responses_item_idx on public.item_responses (item_id);
create index if not exists item_responses_sitting_idx on public.item_responses (sitting_id);

-- Phase-3 scaffolds (PAY-001 consumes; no enforcement here)
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  sku text not null,
  exam_id uuid references public.exams (id),
  status text not null check (status in ('active', 'expired', 'revoked')),
  source text not null,
  starts_at timestamptz not null,
  ends_at timestamptz
);

create index if not exists entitlements_user_status_idx on public.entitlements (user_id, status);

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  exam_id uuid references public.exams (id),
  tier text not null check (tier in ('tier1', 'tier2')),
  currency char(3) not null,
  amount_minor bigint not null check (amount_minor >= 0),
  active boolean not null default true,
  unique (sku, tier, currency)
);

-- Down (documented; prefer `supabase db reset` in local stacks):
-- drop table if exists public.prices cascade;
-- drop table if exists public.entitlements cascade;
-- drop table if exists public.item_responses cascade;
-- drop table if exists public.sittings cascade;
-- drop table if exists public.users cascade;
-- drop table if exists public.items cascade;
-- drop table if exists public.objectives cascade;
-- drop table if exists public.domains cascade;
-- drop table if exists public.exams cascade;
-- drop table if exists public.certifications cascade;
-- drop table if exists public.vendors cascade;
