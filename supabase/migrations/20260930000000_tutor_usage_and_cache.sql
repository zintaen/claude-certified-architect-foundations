-- AI-001: tutor usage ledger + shared answer cache.
-- Caps fail closed: ledger read errors disable the live rung.

create table if not exists public.tutor_usage (
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  requests int not null default 0,
  primary key (user_id, day)
);

create table if not exists public.tutor_cache (
  item_id uuid not null,
  item_version int not null,
  intent_key text not null,
  answer text not null,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, item_version, intent_key)
);

create index if not exists tutor_usage_day_idx on public.tutor_usage (day);

alter table public.tutor_usage enable row level security;
alter table public.tutor_cache enable row level security;
-- Deny-all RLS (no anon/authenticated policies) — service role only.

grant select, insert, update on public.tutor_usage to service_role;
grant select, insert, update, delete on public.tutor_cache to service_role;

-- Atomic budget spend: increments only when under caps; returns false if over.
create or replace function public.tutor_try_spend(
  p_user_id uuid,
  p_day date,
  p_tokens_in bigint,
  p_tokens_out bigint,
  p_max_tokens bigint,
  p_max_requests int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_tokens bigint;
  cur_requests int;
begin
  insert into public.tutor_usage (user_id, day, tokens_in, tokens_out, requests)
  values (p_user_id, p_day, 0, 0, 0)
  on conflict (user_id, day) do nothing;

  select tokens_in + tokens_out, requests
    into cur_tokens, cur_requests
  from public.tutor_usage
  where user_id = p_user_id and day = p_day
  for update;

  if cur_tokens + p_tokens_in + p_tokens_out > p_max_tokens then
    return false;
  end if;
  if cur_requests + 1 > p_max_requests then
    return false;
  end if;

  update public.tutor_usage
  set
    tokens_in = tokens_in + p_tokens_in,
    tokens_out = tokens_out + p_tokens_out,
    requests = requests + 1
  where user_id = p_user_id and day = p_day;

  return true;
end;
$$;

revoke all on function public.tutor_try_spend from public;
grant execute on function public.tutor_try_spend to service_role;
