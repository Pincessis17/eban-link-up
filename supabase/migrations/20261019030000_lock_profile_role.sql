-- SECURITY FIX: nobody can make themselves an admin.
-- Before this, (1) signup trusted the "role" the browser sent, so a crafted signup could create an Admin,
-- and (2) the profiles update policy let any user change their own role. Admin could read every email,
-- confirm payments and pay out. Admins are now promoted only from the Supabase SQL Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data->>'role';
  user_role text := case when requested in ('Sender', 'Traveller') then requested else 'Sender' end;
  user_name text := new.raw_user_meta_data->>'full_name';
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, user_name, user_role)
  on conflict (id) do nothing;

  if user_role = 'Traveller' then
    insert into public.traveller_profiles (user_id, name)
    values (new.id, user_name)
    on conflict (user_id) do nothing;
  else
    insert into public.sender_profiles (user_id, name)
    values (new.id, user_name)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only requests coming from the app (signed-in or anonymous users) are restricted.
  -- The SQL Editor and server-side functions run as other roles and can still promote an admin.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.role not in ('Sender', 'Traveller') then
      raise exception 'Invalid role';
    end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'You cannot change your role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
before insert or update on public.profiles
for each row execute function public.guard_profile_role();
