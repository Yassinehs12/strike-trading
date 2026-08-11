-- Lets a trade record how much was actually risked (dollar amount at the
-- stop loss), not just the P&L outcome — needed to show an R-multiple
-- (gain ÷ risk) per trade, not just the raw dollar result.

alter table trades
  add column if not exists risk_amount numeric;
