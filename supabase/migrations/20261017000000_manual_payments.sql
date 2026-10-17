-- Manual escrow for the real-user MVP.
--   1. Sender sends money to EBAN (mobile money / bank) and taps "I've sent the payment".
--   2. An admin confirms the money arrived -> payment 'held', request 'paid'.
--   3. Delivery proceeds as before; confirm_receipt creates the payout row,
--      and the admin pays the traveler manually (Admin > Payout Console).
-- Also closes the holes that let a user fake a payment or a status from the browser.

---------------------------------------------------------------------------
-- 1. Lock down money: only admins (or the RPCs below) can write payments
---------------------------------------------------------------------------
drop policy if exists payments_write on public.payments;
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The simulated "fund escrow" must no longer be callable by users.
revoke all on function public.fund_escrow(uuid) from public, anon, authenticated;

---------------------------------------------------------------------------
-- 2. Manual payment flow
---------------------------------------------------------------------------
create or replace function public.report_payment_sent(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_amount numeric;
begin
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found or v_req.sender_id <> auth.uid() then raise exception 'Request not found'; end if;
  if v_req.status <> 'accepted_by_traveller' or v_req.matched_traveller_id is null then
    raise exception 'The traveler must accept before you can pay';
  end if;
  v_amount := coalesce(
    v_req.agreed_price, v_req.offered_price,
    (select total_price from public.pricing_breakdowns where request_id = v_req.id)
  );
  if v_amount is null or v_amount <= 0 then raise exception 'No price has been agreed yet'; end if;
  if exists (select 1 from public.payments where request_id = v_req.id) then
    raise exception 'A payment has already been reported for this request';
  end if;

  insert into public.payments (request_id, sender_id, amount, status)
  values (v_req.id, v_req.sender_id, v_amount, 'pending');
  update public.delivery_requests set agreed_price = v_amount where id = v_req.id;
end;
$$;

create or replace function public.admin_confirm_payment(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Only admins can confirm payments'; end if;
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_req.status <> 'accepted_by_traveller' then
    raise exception 'This request is no longer waiting for payment (status: %)', v_req.status;
  end if;
  if not exists (select 1 from public.payments where request_id = v_req.id and status = 'pending') then
    raise exception 'No pending payment for this request';
  end if;
  update public.payments set status = 'held' where request_id = v_req.id;
  update public.delivery_requests set status = 'paid' where id = v_req.id;
end;
$$;

-- Money never arrived (or wrong amount): remove the claim so the sender can try again.
create or replace function public.admin_reject_payment(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can reject payments'; end if;
  delete from public.payments where request_id = p_request_id and status = 'pending';
  if not found then raise exception 'No pending payment for this request'; end if;
end;
$$;

-- A request with a reported/held payment can no longer be cancelled or deleted by the sender.
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
begin
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found or v_req.sender_id <> auth.uid() then raise exception 'Request not found'; end if;
  if v_req.status not in ('submitted', 'matched', 'accepted_by_traveller') then
    raise exception 'This request can no longer be cancelled. Report an issue instead.';
  end if;
  if exists (select 1 from public.payments where request_id = v_req.id) then
    raise exception 'A payment was already reported for this request. Contact EBAN so it can be sorted out.';
  end if;

  if v_req.trip_id is not null and v_req.status in ('matched', 'accepted_by_traveller') then
    update public.trips set available_kg = least(capacity_kg, available_kg + v_req.weight_kg)
     where id = v_req.trip_id;
  end if;
  update public.matches set status = 'rejected'
   where request_id = v_req.id and status in ('pending', 'accepted');
  update public.delivery_requests set status = 'cancelled' where id = v_req.id;
end;
$$;

drop policy if exists delivery_requests_delete_guard on public.delivery_requests;
create policy delivery_requests_delete_guard on public.delivery_requests
  as restrictive for delete to authenticated
  using (
    public.is_admin()
    or (sender_id = auth.uid()
        and status in ('draft', 'submitted', 'matched', 'accepted_by_traveller', 'cancelled')
        and not exists (select 1 from public.payments p where p.request_id = delivery_requests.id))
  );

---------------------------------------------------------------------------
-- 3. Stop direct browser edits that skip the rules
--    (security definer functions run as their owner, so they are not affected)
---------------------------------------------------------------------------
-- RLS hides payments from travelers, so the guard below asks through this helper.
create or replace function public.request_payment_held(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.payments where request_id = p_request_id and status = 'held');
$$;
revoke all on function public.request_payment_held(uuid) from public, anon;
grant execute on function public.request_payment_held(uuid) to authenticated;

create or replace function public.guard_request_update()
returns trigger
language plpgsql
as $$
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
  return new;
end;
$$;
drop trigger if exists guard_request_update on public.delivery_requests;
create trigger guard_request_update before update on public.delivery_requests
  for each row execute function public.guard_request_update();

-- Travelers must not edit their own rating or delivery count.
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
  elsif new.rating is distinct from old.rating or new.total_deliveries is distinct from old.total_deliveries then
    raise exception 'Rating and delivery count are managed by EBAN';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_traveller_profile on public.traveller_profiles;
create trigger guard_traveller_profile before insert or update on public.traveller_profiles
  for each row execute function public.guard_traveller_profile();

---------------------------------------------------------------------------
-- 4. Grants
---------------------------------------------------------------------------
revoke all on function public.report_payment_sent(uuid) from public, anon;
revoke all on function public.admin_confirm_payment(uuid) from public, anon;
revoke all on function public.admin_reject_payment(uuid) from public, anon;
grant execute on function public.report_payment_sent(uuid) to authenticated;
grant execute on function public.admin_confirm_payment(uuid) to authenticated;
grant execute on function public.admin_reject_payment(uuid) to authenticated;
