-- Owner-locked roles: admins can grant "admin" or "supporter" status to other
-- users, but only the designated owner account can remove those roles once
-- granted. This is enforced here in the database (not just the UI) because
-- any admin could otherwise call the Supabase client directly and bypass a
-- client-side-only restriction.

-- 1. Add the supporter role column (admin already exists as is_admin).
alter table public.profiles add column if not exists is_supporter boolean not null default false;

-- 2. Set your own account as the permanent owner.
--    Replace the UUID below with YOUR user id before running this migration.
--    You can find your user id in the app under Settings > Account > Account ID
--    (there's a copy button next to it).
create table if not exists public.app_owner (
  user_id uuid primary key
);

-- Wipe and reinsert so re-running this migration is safe.
truncate table public.app_owner;
insert into public.app_owner (user_id) values
  ('00000000-0000-0000-0000-000000000000'); -- <-- REPLACE with your real user id

alter table public.app_owner enable row level security;
-- No one needs direct table access from the client; everything goes through
-- the security-definer functions below.
revoke all on public.app_owner from anon, authenticated;

-- 3. Helper the frontend can call to know if the signed-in user is the owner.
create or replace function public.am_i_owner()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.app_owner where user_id = auth.uid());
$$;

grant execute on function public.am_i_owner() to authenticated;

-- 4. Enforce role-change rules at the database level:
--    - Granting is_admin/is_supporter (false -> true) requires the actor to
--      already be an admin (or be the owner).
--    - Revoking is_admin/is_supporter (true -> false) requires the actor to
--      be the owner. Nobody else can remove a role once it's granted.
create or replace function public.enforce_role_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  actor_is_admin boolean;
  actor_is_owner boolean;
begin
  -- Nothing role-related changed — allow through untouched.
  if (new.is_admin is not distinct from old.is_admin)
     and (new.is_supporter is not distinct from old.is_supporter) then
    return new;
  end if;

  actor_is_owner := public.am_i_owner();

  if actor_is_owner then
    return new; -- the owner can grant or revoke freely
  end if;

  -- Revoking either role: owner only.
  if (old.is_admin = true and new.is_admin = false)
     or (old.is_supporter = true and new.is_supporter = false) then
    raise exception 'Only the owner account can remove admin or supporter roles.';
  end if;

  -- Granting a role: actor must already be an admin.
  select is_admin into actor_is_admin from public.profiles where id = auth.uid();
  if not coalesce(actor_is_admin, false) then
    raise exception 'Only admins can grant roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_role_changes on public.profiles;
create trigger trg_enforce_role_changes
  before update on public.profiles
  for each row
  execute function public.enforce_role_changes();
