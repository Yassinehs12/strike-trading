-- Owner-locked roles: only the designated owner account can grant OR remove
-- "admin" or "supporter" status on any profile. This is enforced here in the
-- database (not just the UI) because anyone could otherwise call the
-- Supabase client directly and bypass a client-side-only restriction.

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
--    Only the owner can change is_admin or is_supporter on any profile —
--    granting a role and removing one both require being the owner. No one
--    else, including existing admins, can hand out or take away roles.
create or replace function public.enforce_role_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Nothing role-related changed — allow through untouched.
  if (new.is_admin is not distinct from old.is_admin)
     and (new.is_supporter is not distinct from old.is_supporter) then
    return new;
  end if;

  if not public.am_i_owner() then
    raise exception 'Only the owner account can grant or remove admin or supporter roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_role_changes on public.profiles;
create trigger trg_enforce_role_changes
  before update on public.profiles
  for each row
  execute function public.enforce_role_changes();
