-- Removes the "minimum 3 trades" requirement from the leaderboard.
-- Identical to the existing get_leaderboard function, minus the
-- `having count(*) >= 3` clause — everything else (opt-in filter, period
-- windowing, ranking, limit) is unchanged.

CREATE OR REPLACE FUNCTION public.get_leaderboard(period text)
 RETURNS TABLE(user_id uuid, username text, avatar_url text, win_rate numeric, net_pnl numeric, trade_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    t.user_id,
    p.username,
    p.avatar_url,
    round(100.0 * count(*) filter (where t.status = 'Win') / nullif(count(*), 0), 1) as win_rate,
    round(sum(t.pnl - t.fees), 2) as net_pnl,
    count(*)::int as trade_count
  from trades t
  join profiles p on p.id = t.user_id
  where p.leaderboard_opt_in = true
    and t.date >= case
      when period = 'week' then date_trunc('week', now())::date
      when period = 'month' then date_trunc('month', now())::date
      else '1900-01-01'::date
    end
  group by t.user_id, p.username, p.avatar_url
  order by net_pnl desc
  limit 100;
$function$
