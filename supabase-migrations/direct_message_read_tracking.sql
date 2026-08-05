-- Adds read tracking to direct_messages so the app can show an unread
-- message badge in the sidebar next to "Messages".
--
-- read_at is null until the recipient opens that conversation, at which
-- point the app sets it to now() for every unread message in that thread.

alter table direct_messages
  add column if not exists read_at timestamptz;

-- Speeds up the unread-count query (recipient_id + read_at IS NULL),
-- which runs on every page load / realtime insert while signed in.
create index if not exists direct_messages_unread_idx
  on direct_messages (recipient_id)
  where read_at is null;
