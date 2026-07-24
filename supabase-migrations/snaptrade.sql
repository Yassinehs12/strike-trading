-- SnapTrade integration -------------------------------------------------
-- SnapTrade (https://snaptrade.com) bridges real brokerages (Robinhood,
-- Schwab, Fidelity, IBKR, etc.) via each broker's own OAuth-style login —
-- unlike MetaApi (MT4/MT5), no password ever touches our server or
-- SnapTrade's; the user authenticates directly with their broker inside
-- SnapTrade's hosted "connection portal".
--
-- This replaces the old MT4/MT5 broker-sync flow (broker_connections
-- table, connect-broker Edge Function) as the primary way users link
-- accounts. That table/function are left in place but unused; drop them
-- yourself once you're sure nothing references them.

-- One row per app user who has been registered with SnapTrade. SnapTrade
-- issues a `userSecret` at registration time that must be sent with every
-- subsequent API call for that user — it is effectively that user's API
-- key and must never be exposed to the client, only used server-side in
-- Edge Functions.
create table if not exists public.snaptrade_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snaptrade_user_id text not null,
  snaptrade_user_secret text not null,
  created_at timestamptz not null default now()
);

alter table public.snaptrade_users enable row level security;

-- No policy grants SELECT/UPDATE to anon/authenticated roles on purpose —
-- snaptrade_user_secret is a bearer credential for SnapTrade's API and
-- must only ever be read by Edge Functions using the service role key,
-- never by the browser client.

-- One row per brokerage account connected through SnapTrade for a user.
-- Mirrors what SnapTrade's /accounts endpoint returns; refreshed on sync.
create table if not exists public.snaptrade_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snaptrade_account_id text not null unique,
  brokerage text,
  account_name text,
  account_number text,
  balance numeric,
  currency text default 'USD',
  status text not null default 'active' check (status in ('active', 'disabled', 'removed')),
  last_synced_at timestamptz,
  -- Optional link to one of the user's existing trading_accounts so
  -- synced trades can be filtered/grouped the same way manual ones are.
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.snaptrade_accounts enable row level security;

create policy "snaptrade_accounts: owner full access" on public.snaptrade_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists snaptrade_accounts_user_id_idx on public.snaptrade_accounts(user_id);

-- Trades imported from SnapTrade need a way to (a) know they came from a
-- sync rather than manual entry, and (b) be de-duplicated on re-sync.
alter table public.trades
  add column if not exists source text not null default 'manual' check (source in ('manual', 'snaptrade'));

alter table public.trades
  add column if not exists snaptrade_activity_id text;

-- A given SnapTrade activity should only ever produce one trade row.
create unique index if not exists trades_snaptrade_activity_id_idx
  on public.trades(snaptrade_activity_id)
  where snaptrade_activity_id is not null;
