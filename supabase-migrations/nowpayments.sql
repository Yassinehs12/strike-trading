-- Switches crypto_payments from Coinbase Commerce to NOWPayments.
-- Run after crypto_payments.sql (supabase db push or SQL editor).

alter table public.crypto_payments
  alter column coinbase_charge_id drop not null;

alter table public.crypto_payments
  add column if not exists provider text not null default 'nowpayments',
  add column if not exists order_id text unique,
  add column if not exists np_invoice_id text,
  add column if not exists np_payment_id text,
  add column if not exists np_status text;

create index if not exists crypto_payments_order_id_idx on public.crypto_payments(order_id);
