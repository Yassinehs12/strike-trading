-- Without this, markConversationRead() silently updates zero rows: Supabase
-- doesn't error when RLS filters out every row a policy doesn't cover, it
-- just performs a no-op update. The existing UPDATE policy on
-- direct_messages almost certainly only covers the sender (for the
-- edit/soft-delete feature) — this adds a second, separate policy letting
-- the recipient update rows addressed to them, which Postgres combines
-- with the existing one via OR (RLS policies are permissive by default).

drop policy if exists "Recipients can mark their messages as read" on direct_messages;

create policy "Recipients can mark their messages as read"
  on direct_messages
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
