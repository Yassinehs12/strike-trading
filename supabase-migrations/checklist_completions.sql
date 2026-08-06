-- Pre-market checklist state, moved from localStorage (per-browser only)
-- to a real table so it syncs across devices.
--
-- account_id uses a fixed sentinel UUID for the "All Accounts" bucket
-- rather than allowing null, so a single simple unique constraint can
-- back upsert()'s ON CONFLICT target — Postgres can't target a nullable
-- column in a plain unique constraint via upsert cleanly. It's
-- deliberately NOT a foreign key to trading_accounts, since the sentinel
-- value doesn't correspond to a real account row.

create table if not exists checklist_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null default '00000000-0000-0000-0000-000000000000',
  checklist_date date not null,
  checked_items jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, account_id, checklist_date)
);

alter table checklist_completions enable row level security;

drop policy if exists "Users manage their own checklist completions" on checklist_completions;
create policy "Users manage their own checklist completions"
  on checklist_completions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
