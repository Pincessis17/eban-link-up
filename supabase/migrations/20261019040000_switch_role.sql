-- One account, both sides. A signed-in user can switch between Sender and Traveller mode.
-- Run AFTER 20261019030000_lock_profile_role.sql (role is not editable directly, only through this function).
-- Admins are not affected: their role cannot be switched here.

create or replace function public.switch_role(p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if p_role not in ('Sender', 'Traveller') then raise exception 'Invalid role'; end if;

  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.role = 'Admin' then raise exception 'Admin accounts cannot switch role'; end if;

  -- Make sure the profile for the side being entered exists, so nothing breaks the first time.
  if p_role = 'Traveller' then
    insert into public.traveller_profiles (user_id, name)
    values (auth.uid(), v_profile.full_name)
    on conflict (user_id) do nothing;
  else
    insert into public.sender_profiles (user_id, name)
    values (auth.uid(), v_profile.full_name)
    on conflict (user_id) do nothing;
  end if;

  update public.profiles set role = p_role where id = auth.uid();
  return p_role;
end;
$$;

revoke all on function public.switch_role(text) from public, anon;
grant execute on function public.switch_role(text) to authenticated;
