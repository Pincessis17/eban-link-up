-- Only an EBAN admin can approve a traveler's ID.
-- Without this, a traveler could approve themselves from the browser
-- (they can write their own traveller_profiles row and insert verifications).

create or replace function public.guard_traveller_profile()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating := 5.00;
    new.total_deliveries := 0;
    new.verification_status := 'pending';
  elsif new.rating is distinct from old.rating
     or new.total_deliveries is distinct from old.total_deliveries then
    raise exception 'Rating and delivery count are managed by EBAN';
  elsif new.verification_status is distinct from old.verification_status then
    raise exception 'Verification can only be changed by an EBAN admin';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_traveller_profile on public.traveller_profiles;
create trigger guard_traveller_profile before insert or update on public.traveller_profiles
  for each row execute function public.guard_traveller_profile();

create or replace function public.guard_verification_insert()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.status := 'pending';
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_verification_insert on public.verifications;
create trigger guard_verification_insert before insert on public.verifications
  for each row execute function public.guard_verification_insert();
