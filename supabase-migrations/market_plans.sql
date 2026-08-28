-- One market plan per user per calendar day. plan_date + user_id is unique
-- so "today's plan" is always a single row to upsert against, and past
-- days remain in history automatically — nothing needs to be archived or
-- reset by the app, the new day just doesn't have a row yet until the
-- user writes one.

create table if not exists public.market_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

alter table public.market_plans enable row level security;

drop policy if exists "Users can view own market plans" on public.market_plans;
create policy "Users can view own market plans"
  on public.market_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own market plans" on public.market_plans;
create policy "Users can insert own market plans"
  on public.market_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own market plans" on public.market_plans;
create policy "Users can update own market plans"
  on public.market_plans for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own market plans" on public.market_plans;
create policy "Users can delete own market plans"
  on public.market_plans for delete
  using (auth.uid() = user_id);

create index if not exists market_plans_user_date_idx on public.market_plans(user_id, plan_date desc);
