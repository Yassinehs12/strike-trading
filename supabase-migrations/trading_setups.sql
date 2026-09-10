-- Trading Setups (personal setup library) ------------------------------
create table if not exists public.trading_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  markets text[] not null default '{}',
  direction text not null default 'neutral' check (direction in ('bullish', 'bearish', 'neutral')),
  htf_timeframe text default '',
  entry_timeframe text default '',
  entry_rules jsonb not null default '[]'::jsonb,       -- [{ id, text, required }]
  invalidation_rules jsonb not null default '[]'::jsonb, -- [{ id, text }]
  typical_risk_pct numeric,
  min_rr text default '',
  stop_loss_method text default '',
  take_profit_method text default '',
  max_entries integer,
  notes text default '',
  examples text[] not null default '{}',                -- base64 chart screenshots, same pattern as trades.screenshots
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.trading_setups enable row level security;

create policy "trading_setups: owner full access" on public.trading_setups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists trading_setups_user_id_idx on public.trading_setups(user_id);
