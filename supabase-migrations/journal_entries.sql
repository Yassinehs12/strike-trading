-- Weekly / Monthly journaling (reflections separate from individual trade logs)
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null, -- Monday of the week, or the 1st of the month
  rating smallint check (rating between 1 and 5),
  went_well text default '',
  improve text default '',
  lessons text default '',
  goals_next text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

alter table public.journal_entries enable row level security;

create policy "journal_entries: owner full access" on public.journal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists journal_entries_user_period_idx on public.journal_entries(user_id, period_type, period_start desc);
