-- Broker / prop firm account connections -------------------------------
-- IMPORTANT: this table intentionally does NOT store the investor
-- password. The password is sent once, directly from the client to the
-- `connect-broker` Edge Function, which hands it to MetaApi (the MT4/MT5
-- bridge) to provision the connection. MetaApi is the system of record for
-- the credential — we only ever keep a reference id (`metaapi_account_id`)
-- and connection status here. If this table's contents leaked, no broker
-- credential would be exposed.
create table if not exists public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Optional link to one of the user's funding challenges, so a connected
  -- account can auto-sync into a specific challenge's trade log. No hard
  -- foreign key here on purpose — confirm your `challenges.id` column type
  -- in the Supabase dashboard and add
  --   references public.challenges(id) on delete set null
  -- yourself if you want it enforced.
  challenge_id text,

  platform text not null check (platform in ('mt4', 'mt5', 'ctrader')),
  broker_server text not null,
  login text not null,

  -- Reference id returned by MetaApi after provisioning. Never the password.
  metaapi_account_id text,

  status text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disconnected')),
  error_message text,
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.broker_connections enable row level security;

-- Owners can see and manage their own connections. Nothing here is ever
-- readable by other users, and there's no admin override — broker account
-- identifiers (server + login) are sensitive enough that even you, as the
-- app owner, shouldn't casually browse them across all users.
create policy "broker_connections: owner full access" on public.broker_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists broker_connections_user_id_idx on public.broker_connections(user_id);
