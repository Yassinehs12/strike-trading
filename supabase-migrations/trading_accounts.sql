-- Multiple trading accounts per user (e.g. "FTMO Live", "Demo Practice",
-- "Personal MT5") so trades can be filtered/organized by account.
--
-- The account-count LIMIT itself is enforced in the app (see
-- FREE_ACCOUNT_LIMIT in src/App.jsx), not here in SQL — that's
-- intentional: once you have real membership tiers, the limit per plan
-- should live wherever your plan/entitlement data lives, and the app
-- reads that instead of a single hardcoded constant. This table has no
-- opinion on how many accounts a user is "allowed" — it just stores them.

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text,
  account_type text not null default 'live' check (account_type in ('live', 'demo', 'funded', 'prop_challenge')),
  starting_balance numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trading_accounts enable row level security;

create policy "trading_accounts: owner full access" on public.trading_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);

-- Optional link from a trade to the account it was taken on. Nullable —
-- existing trades logged before this feature stay valid with no account
-- assigned, and new trades can optionally be tagged going forward.
alter table public.trades
  add column if not exists account_id uuid references public.trading_accounts(id) on delete set null;

create index if not exists trades_account_id_idx on public.trades(account_id);
