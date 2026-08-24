-- The app (src/db.js, TradeComponents.jsx) reads/writes trades.screenshots
-- as a JSON array of image data URLs (chart screenshots attached to a
-- trade), but this column was never added to the live database — it only
-- exists in app code, causing "Could not find the 'screenshots' column of
-- 'trades' in the schema cache" from PostgREST whenever a trade is
-- saved/updated with an image attached.

alter table public.trades
  add column if not exists screenshots jsonb not null default '[]'::jsonb;