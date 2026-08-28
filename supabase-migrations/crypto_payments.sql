-- Adds Pro subscription tracking to profiles, and a crypto_payments table
-- that records every Coinbase Commerce charge we create/confirm. Run this
-- with the Supabase CLI (`supabase db push`) or paste into the SQL editor
-- in the Supabase dashboard.

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro')),
  add column if not exists plan_expires_at timestamptz;

-- One row per Coinbase Commerce charge. Created when the user clicks
-- "Pay with Crypto" (status = 'pending'), updated by the webhook when
-- Coinbase confirms payment (status = 'confirmed') or it expires/fails.
create table if not exists public.crypto_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coinbase_charge_id text not null unique,
  coinbase_charge_code text,
  plan_interval text not null check (plan_interval in ('monthly', 'yearly')),
  amount_usd numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.crypto_payments enable row level security;

-- Users can see their own payment history. All writes go through the
-- service-role key inside the Edge Functions, never directly from the
-- client, so there are no insert/update policies here on purpose.
drop policy if exists "Users can view own crypto payments" on public.crypto_payments;
create policy "Users can view own crypto payments"
  on public.crypto_payments for select
  using (auth.uid() = user_id);

create index if not exists crypto_payments_user_id_idx on public.crypto_payments(user_id);
create index if not exists crypto_payments_charge_id_idx on public.crypto_payments(coinbase_charge_id);
