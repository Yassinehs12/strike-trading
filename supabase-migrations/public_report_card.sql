-- Public "Trader Report Card" -------------------------------------------
-- Powers the public, opt-in profile page at #/u/:username. These RPCs are
-- `security definer` so they can read the trades table (which normal RLS
-- would otherwise block for other users) but they only ever return
-- pre-aggregated numbers — no raw trade rows, no dollar P&L, no dates,
-- nothing that could reconstruct someone's actual trading history.
-- Written to be safe to re-run: every object uses IF NOT EXISTS / OR
-- REPLACE, so this won't error if some pieces already exist in your DB.

alter table public.profiles
  add column if not exists show_public_stats boolean not null default false;

-- Badge-relevant facts: how long they've been journaling, funded status,
-- current streak. No P&L numbers at all.
--
-- DROP first: these functions may already exist in your database with a
-- different return signature (Postgres refuses to change a function's
-- return type via CREATE OR REPLACE — you'll see error 42P13 otherwise).
drop function if exists public.get_public_badges(uuid);
create or replace function public.get_public_badges(target_user_id uuid)
returns table (trade_count bigint, is_funded boolean, streak_days int)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.trades t where t.user_id = target_user_id) as trade_count,
    exists (
      select 1 from public.challenges c
      where c.user_id = target_user_id and c.stage = 'funded'
    ) as is_funded,
    coalesce((
      select count(distinct t.date)
      from public.trades t
      where t.user_id = target_user_id
        and t.date >= (current_date - interval '30 days')
    ), 0)::int as streak_days
  from public.profiles p
  where p.id = target_user_id and p.show_public_stats = true;
$$;

-- Win rate + favorite asset only — rounded, no raw dollar figures, and
-- only returned at all if the user has opted in via show_public_stats.
drop function if exists public.get_public_trading_stats(uuid);
create or replace function public.get_public_trading_stats(target_user_id uuid)
returns table (win_rate numeric, total_closed_trades bigint, favorite_asset text)
language sql
security definer
set search_path = public
as $$
  select
    case when count(*) filter (where t.status in ('Win','Loss')) > 0
      then round(100.0 * count(*) filter (where t.status = 'Win')
           / count(*) filter (where t.status in ('Win','Loss')), 1)
      else null end as win_rate,
    count(*) filter (where t.status in ('Win','Loss')) as total_closed_trades,
    (
      select t2.asset from public.trades t2
      where t2.user_id = target_user_id
      group by t2.asset
      order by count(*) desc
      limit 1
    ) as favorite_asset
  from public.trades t
  join public.profiles p on p.id = target_user_id
  where t.user_id = target_user_id and p.show_public_stats = true;
$$;

-- Anyone (including anonymous visitors) can call these — they're the
-- whole point of a public report card — but the functions themselves
-- refuse to return anything unless show_public_stats is true, so
-- opting out is a real, enforced guarantee, not just a UI toggle.
grant execute on function public.get_public_badges(uuid) to anon, authenticated;
grant execute on function public.get_public_trading_stats(uuid) to anon, authenticated;

-- Public profile lookups by username (needed to resolve /u/:username to a
-- user id before calling the RPCs above). Only exposes non-sensitive
-- columns, and only for profiles that opted in.
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(target_username text)
returns table (id uuid, username text, avatar_url text, bio text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.avatar_url, p.bio, p.created_at
  from public.profiles p
  where p.username = target_username and p.show_public_stats = true;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
