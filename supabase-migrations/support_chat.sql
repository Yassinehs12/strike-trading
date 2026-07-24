-- Live support chat: each user has one ongoing conversation with the
-- Strike Journal team. Users see only their own conversation; anyone with
-- profiles.is_admin = true (the same flag your Admin Panel already uses)
-- can see and reply to everyone's.

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  unread_by_admin boolean not null default true,
  unread_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "support_conversations: owner read/write" on public.support_conversations;
create policy "support_conversations: owner read/write" on public.support_conversations
  for all
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "support_messages: participant read/write" on public.support_messages;
create policy "support_messages: participant read/write" on public.support_messages
  for all
  using (
    exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    )
  )
  with check (
    exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    )
  );

create index if not exists support_messages_conversation_id_idx on public.support_messages(conversation_id);
create index if not exists support_conversations_last_message_idx on public.support_conversations(last_message_at desc);
