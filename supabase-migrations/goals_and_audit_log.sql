-- Personal goal setting -----------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  metric text not null check (metric in ('profit', 'win_rate', 'trade_count', 'custom')),
  target_value numeric,
  start_date date not null default current_date,
  end_date date,
  notes text default '',
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals: owner full access" on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists goals_user_id_idx on public.goals(user_id);

-- Audit log -------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_username text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Any admin can insert an entry (e.g. when performing a moderation action).
create policy "audit_log: admins can insert" on public.audit_log
  for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Only admins can read the log.
create policy "audit_log: admins can read" on public.audit_log
  for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
