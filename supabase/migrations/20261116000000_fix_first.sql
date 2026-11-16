-- "Fix first" items from the system review.
-- 1. Parcel details freeze once a traveller is involved (no editing weight/item after booking or paying).
-- 2. Disputes: only an admin can change or delete one after it is raised.
-- 3. Escrow auto-release: 72 hours after "delivered" with no problem reported, the traveller is paid.
-- 4. Self-repair: a signed-in person whose profile is missing gets it rebuilt automatically.
-- Safe to run more than once.

-- ---------------------------------------------------------------- 1
create or replace function public.guard_request_update()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if new.sender_id is distinct from old.sender_id
     or new.matched_traveller_id is distinct from old.matched_traveller_id
     or new.trip_id is distinct from old.trip_id
     or new.agreed_price is distinct from old.agreed_price then
    raise exception 'That field can only be changed through the app''s actions';
  end if;

  -- What is being sent, how much it weighs and where it goes are fixed once a traveller is involved,
  -- and only the sender may ever change them.
  if new.item_type is distinct from old.item_type
     or new.item_description is distinct from old.item_description
     or new.weight_kg is distinct from old.weight_kg
     or new.item_value is distinct from old.item_value
     or new.special_handling_flags is distinct from old.special_handling_flags
     or new.urgency_level is distinct from old.urgency_level
     or new.offered_price is distinct from old.offered_price
     or new.origin_country is distinct from old.origin_country
     or new.origin_city is distinct from old.origin_city
     or new.destination_country is distinct from old.destination_country
     or new.destination_city is distinct from old.destination_city
     or new.preferred_date is distinct from old.preferred_date then
    if old.sender_id <> auth.uid() then
      raise exception 'Only the sender can change the parcel details';
    end if;
    if old.status not in ('draft', 'submitted') then
      raise exception 'The parcel details are locked once a traveller has taken the request. Cancel it or contact Eban to change them.';
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'accepted_by_traveller' then
      if old.status <> 'matched' then raise exception 'Invalid status change'; end if;
    elsif new.status in ('handed_to_traveller', 'in_transit', 'delivered') then
      if not public.request_payment_held(new.id) then
        raise exception 'This request has not been paid yet';
      end if;
      if (new.status = 'handed_to_traveller' and old.status not in ('paid', 'dropped_off'))
         or (new.status = 'in_transit' and old.status <> 'handed_to_traveller')
         or (new.status = 'delivered' and old.status not in ('handed_to_traveller', 'in_transit')) then
        raise exception 'Invalid status change';
      end if;
    else
      raise exception 'That status can only be set through the app''s actions';
    end if;
  end if;

  -- The delivery time drives the automatic payment release, so set it on the server.
  if new.status = 'delivered' and old.status <> 'delivered' then
    new.delivered_at := now();
  end if;
  return new;
end;
$function$;

-- ---------------------------------------------------------------- 2
-- Raising a dispute goes through raise_dispute / report_not_received. After that only admins can touch it.
drop policy if exists disputes_write on public.disputes;
drop policy if exists disputes_admin_write on public.disputes;
create policy disputes_admin_write on public.disputes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- 3
create or replace function public.auto_release_delivered(p_hours integer default 72)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select * from public.delivery_requests dr
    where dr.status = 'delivered'
      and dr.delivered_at is not null
      and dr.delivered_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.disputes d where d.request_id = dr.id and d.status in ('open', 'under_review'))
    for update
  loop
    update public.delivery_requests set status = 'completed', pickup_confirmed_at = now() where id = r.id;
    update public.payments set status = 'released' where request_id = r.id and status = 'held';
    if not exists (select 1 from public.payouts where request_id = r.id) then
      insert into public.payouts (traveller_id, request_id, amount, status)
      values (r.matched_traveller_id, r.id, greatest(coalesce(r.agreed_price, 0), 0), 'pending');
      update public.traveller_profiles set total_deliveries = total_deliveries + 1 where id = r.matched_traveller_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function public.auto_release_delivered(integer) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'auto-release-delivered';
    perform cron.schedule('auto-release-delivered', '15 * * * *', 'select public.auto_release_delivered(72)');
  end if;
end $$;

-- ---------------------------------------------------------------- 4
create or replace function public.ensure_my_profile()
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  u auth.users%rowtype;
  v_role text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into u from auth.users where id = auth.uid();
  if not found then raise exception 'Account not found'; end if;

  if exists (select 1 from public.profiles where id = u.id) then
    select role into v_role from public.profiles where id = u.id;
    return v_role;
  end if;

  v_role := case when u.raw_user_meta_data->>'role' in ('Sender', 'Traveller') then u.raw_user_meta_data->>'role' else 'Sender' end;
  v_name := nullif(trim(u.raw_user_meta_data->>'full_name'), '');

  insert into public.profiles (id, email, full_name, role) values (u.id, u.email, v_name, v_role)
  on conflict (id) do nothing;
  insert into public.sender_profiles (user_id, name) values (u.id, v_name) on conflict (user_id) do nothing;
  if v_role = 'Traveller' then
    insert into public.traveller_profiles (user_id, name) values (u.id, v_name) on conflict (user_id) do nothing;
  end if;
  return v_role;
end;
$function$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
