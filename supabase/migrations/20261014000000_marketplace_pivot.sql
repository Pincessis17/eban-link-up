-- Marketplace pivot: EBAN is a platform that connects senders and travelers.
-- EBAN does not take custody of goods. Trust comes from ID verification,
-- ratings, and payment held in escrow until the sender confirms receipt.
--
-- Additive migration: new columns/tables/functions plus two guard policies.
-- Safe to run once in the Supabase SQL editor (EBAN project).
-- PAYMENTS ARE SIMULATED: fund_escrow() records a held payment but does not
-- charge a card. Wire a real processor (Stripe Connect / Flutterwave / Paystack)
-- before taking real money.

---------------------------------------------------------------------------
-- 1. Columns
---------------------------------------------------------------------------
alter table public.trips
  add column if not exists price_per_kg numeric(10,2);

alter table public.delivery_requests
  add column if not exists trip_id uuid references public.trips(id) on delete set null,
  add column if not exists offered_price numeric(10,2),
  add column if not exists agreed_price numeric(10,2),
  add column if not exists sender_dropoff_confirmed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists pickup_confirmed_at timestamptz;

create index if not exists delivery_requests_trip_id_idx on public.delivery_requests(trip_id);

---------------------------------------------------------------------------
-- 2. Messages (per request, between the sender and the matched traveler)
---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.delivery_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_request_idx on public.messages(request_id, created_at);
alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;

create or replace function public.is_request_participant(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.delivery_requests dr
    left join public.traveller_profiles tp on tp.id = dr.matched_traveller_id
    where dr.id = p_request_id
      and (dr.sender_id = auth.uid() or tp.user_id = auth.uid())
  );
$$;

create policy messages_select on public.messages
  for select using (public.is_request_participant(request_id));
create policy messages_insert on public.messages
  for insert with check (author_id = auth.uid() and public.is_request_participant(request_id));

---------------------------------------------------------------------------
-- 3. Browse functions (limited columns, no personal contact details)
---------------------------------------------------------------------------
create or replace function public.browse_open_trips()
returns table (
  id uuid, origin_country text, origin_city text,
  destination_country text, destination_city text,
  departure_date date, arrival_date date,
  available_kg numeric, price_per_kg numeric,
  restricted_item_preferences text,
  traveller_first_name text, traveller_rating numeric,
  traveller_deliveries integer, traveller_verified boolean, is_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.origin_country, t.origin_city, t.destination_country, t.destination_city,
         t.departure_date, t.arrival_date, t.available_kg, t.price_per_kg,
         t.restricted_item_preferences,
         split_part(coalesce(tp.name, 'Traveler'), ' ', 1),
         tp.rating, tp.total_deliveries,
         (tp.verification_status = 'approved'),
         (tp.user_id = auth.uid())
  from public.trips t
  join public.traveller_profiles tp on tp.id = t.traveller_id
  where t.status = 'open' and t.departure_date >= current_date and t.available_kg > 0
  order by t.departure_date asc;
$$;

create or replace function public.browse_open_requests()
returns table (
  id uuid, origin_country text, origin_city text,
  destination_country text, destination_city text,
  item_type text, item_description text, weight_kg numeric, item_value numeric,
  urgency_level text, preferred_date date, special_handling_flags text[],
  offered_price numeric, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select dr.id, dr.origin_country, dr.origin_city, dr.destination_country, dr.destination_city,
         dr.item_type, dr.item_description, dr.weight_kg, dr.item_value,
         dr.urgency_level, dr.preferred_date, dr.special_handling_flags,
         dr.offered_price, dr.created_at
  from public.delivery_requests dr
  where dr.status = 'submitted'
    and dr.matched_traveller_id is null
    and dr.sender_id <> auth.uid()
    and (dr.preferred_date is null or dr.preferred_date >= current_date)
    and exists (select 1 from public.traveller_profiles me where me.user_id = auth.uid())
  order by dr.created_at desc;
$$;

-- Who is on the other side of this request (first name + trust signals only).
create or replace function public.get_request_counterparty(p_request_id uuid)
returns table (counterparty_role text, first_name text, rating numeric, total_deliveries integer, verified boolean, my_rating integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_tp public.traveller_profiles%rowtype;
begin
  select * into v_req from public.delivery_requests where id = p_request_id;
  if not found then return; end if;
  select * into v_tp from public.traveller_profiles where id = v_req.matched_traveller_id;

  if v_req.sender_id = auth.uid() then
    if v_tp.id is null then return; end if;
    return query select 'traveller'::text, split_part(coalesce(v_tp.name, 'Traveler'), ' ', 1),
                        v_tp.rating, v_tp.total_deliveries, (v_tp.verification_status = 'approved'),
                        (select r.rating from public.ratings r where r.request_id = p_request_id and r.from_user_id = auth.uid() limit 1);
  elsif v_tp.user_id = auth.uid() then
    return query select 'sender'::text, split_part(coalesce(p.full_name, 'Sender'), ' ', 1),
                        null::numeric, null::integer, null::boolean,
                        (select r.rating from public.ratings r where r.request_id = p_request_id and r.from_user_id = auth.uid() limit 1)
                 from public.profiles p where p.id = v_req.sender_id;
  end if;
end;
$$;

---------------------------------------------------------------------------
-- 4. Matching + booking flow
---------------------------------------------------------------------------

-- Sender books space on a traveler's trip. Traveler must then accept.
create or replace function public.book_trip(
  p_trip_id uuid, p_item_type text, p_item_description text,
  p_weight_kg numeric, p_item_value numeric, p_flags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_tp public.traveller_profiles%rowtype;
  v_req uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'Sender') then
    raise exception 'Only sender accounts can book a trip';
  end if;
  if p_weight_kg is null or p_weight_kg <= 0 then raise exception 'Enter a valid weight'; end if;
  if coalesce(trim(p_item_description), '') = '' then raise exception 'Describe the item'; end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.status <> 'open' or v_trip.departure_date < current_date then
    raise exception 'This trip is no longer available';
  end if;
  select * into v_tp from public.traveller_profiles where id = v_trip.traveller_id;
  if v_tp.user_id = auth.uid() then raise exception 'You cannot book your own trip'; end if;
  if v_tp.verification_status <> 'approved' then
    raise exception 'This traveler has not completed ID verification yet';
  end if;
  if v_trip.price_per_kg is null then raise exception 'This trip has no price set yet'; end if;
  if v_trip.available_kg < p_weight_kg then
    raise exception 'Only % kg left on this trip', v_trip.available_kg;
  end if;

  insert into public.delivery_requests (
    sender_id, origin_country, origin_city, destination_country, destination_city,
    item_type, item_description, weight_kg, item_value, urgency_level, preferred_date,
    special_handling_flags, status, matched_traveller_id, trip_id, agreed_price
  ) values (
    auth.uid(), v_trip.origin_country, v_trip.origin_city, v_trip.destination_country, v_trip.destination_city,
    p_item_type, p_item_description, p_weight_kg, coalesce(p_item_value, 0), 'standard', v_trip.departure_date,
    coalesce(p_flags, '{}'), 'matched', v_trip.traveller_id, v_trip.id, round(p_weight_kg * v_trip.price_per_kg, 2)
  ) returning id into v_req;

  insert into public.matches (request_id, traveller_id, match_score, status)
  values (v_req, v_trip.traveller_id, 100, 'pending');

  update public.trips set available_kg = available_kg - p_weight_kg where id = v_trip.id;
  return v_req;
end;
$$;

-- Traveler claims an open request using one of their own trips.
create or replace function public.claim_request(p_request_id uuid, p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_tp public.traveller_profiles%rowtype;
  v_req public.delivery_requests%rowtype;
  v_price numeric;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  select * into v_tp from public.traveller_profiles where id = v_trip.traveller_id;
  if v_tp.user_id <> auth.uid() then raise exception 'You can only claim requests with your own trip'; end if;
  if v_tp.verification_status <> 'approved' then
    raise exception 'Complete ID verification before claiming requests';
  end if;
  if v_trip.status <> 'open' or v_trip.departure_date < current_date then
    raise exception 'That trip is no longer open';
  end if;

  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found or v_req.status <> 'submitted' or v_req.matched_traveller_id is not null then
    raise exception 'This request has already been taken';
  end if;
  if v_req.sender_id = auth.uid() then raise exception 'You cannot claim your own request'; end if;
  if lower(trim(v_req.origin_city)) <> lower(trim(v_trip.origin_city))
     or lower(trim(v_req.destination_city)) <> lower(trim(v_trip.destination_city)) then
    raise exception 'This request is not on your trip route';
  end if;
  if v_trip.available_kg < v_req.weight_kg then
    raise exception 'Not enough space left on this trip (% kg)', v_trip.available_kg;
  end if;

  v_price := coalesce(
    v_req.offered_price,
    case when v_trip.price_per_kg is null then null else round(v_req.weight_kg * v_trip.price_per_kg, 2) end
  );
  if v_price is null then raise exception 'Set a price per kg on your trip first'; end if;

  update public.delivery_requests
     set matched_traveller_id = v_trip.traveller_id, trip_id = v_trip.id,
         status = 'accepted_by_traveller', agreed_price = v_price
   where id = v_req.id;

  insert into public.matches (request_id, traveller_id, match_score, status)
  values (v_req.id, v_trip.traveller_id, 100, 'accepted');

  update public.trips set available_kg = available_kg - v_req.weight_kg where id = v_trip.id;
end;
$$;

-- Traveler declines a booking; the request goes back to the open board.
create or replace function public.decline_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.matches%rowtype;
  v_req public.delivery_requests%rowtype;
begin
  select m.* into v_m
    from public.matches m
    join public.traveller_profiles tp on tp.id = m.traveller_id
   where m.id = p_match_id and tp.user_id = auth.uid()
   for update of m;
  if not found then raise exception 'Booking not found'; end if;
  if v_m.status <> 'pending' then raise exception 'You already responded to this booking'; end if;

  update public.matches set status = 'rejected' where id = v_m.id;

  select * into v_req from public.delivery_requests where id = v_m.request_id for update;
  if v_req.matched_traveller_id = v_m.traveller_id and v_req.status = 'matched' then
    if v_req.trip_id is not null then
      update public.trips set available_kg = least(capacity_kg, available_kg + v_req.weight_kg)
       where id = v_req.trip_id;
    end if;
    update public.delivery_requests
       set matched_traveller_id = null, trip_id = null, status = 'submitted', agreed_price = null
     where id = v_req.id;
  end if;
end;
$$;

-- Sender cancels before paying.
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

  if v_req.trip_id is not null and v_req.status in ('matched', 'accepted_by_traveller') then
    update public.trips set available_kg = least(capacity_kg, available_kg + v_req.weight_kg)
     where id = v_req.trip_id;
  end if;
  update public.matches set status = 'rejected'
   where request_id = v_req.id and status in ('pending', 'accepted');
  update public.delivery_requests set status = 'cancelled' where id = v_req.id;
end;
$$;

---------------------------------------------------------------------------
-- 5. Escrow: fund -> (handover, transit, delivery) -> confirm receipt -> release
---------------------------------------------------------------------------
create or replace function public.fund_escrow(p_request_id uuid)
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
  if v_req.status <> 'accepted_by_traveller' then
    raise exception 'The traveler must accept before you can pay';
  end if;
  v_amount := coalesce(
    v_req.agreed_price, v_req.offered_price,
    (select total_price from public.pricing_breakdowns where request_id = v_req.id)
  );
  if v_amount is null or v_amount <= 0 then raise exception 'No price has been agreed yet'; end if;
  if exists (select 1 from public.payments where request_id = v_req.id) then
    raise exception 'A payment already exists for this request';
  end if;

  -- SIMULATED: no card is charged. Replace with a real processor call.
  insert into public.payments (request_id, sender_id, amount, status)
  values (v_req.id, v_req.sender_id, v_amount, 'held');

  update public.delivery_requests set status = 'paid', agreed_price = v_amount where id = v_req.id;
end;
$$;

create or replace function public.confirm_receipt(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_fee_pct numeric := 0;  -- platform commission %. Undecided, so 0 for now.
  v_gross numeric;
begin
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found or v_req.sender_id <> auth.uid() then raise exception 'Request not found'; end if;
  if v_req.status <> 'delivered' then
    raise exception 'The traveler has not marked this as delivered yet';
  end if;

  v_gross := coalesce(v_req.agreed_price, 0);

  update public.delivery_requests
     set status = 'completed', pickup_confirmed_at = now()
   where id = v_req.id;
  update public.payments set status = 'released' where request_id = v_req.id and status = 'held';

  if not exists (select 1 from public.payouts where request_id = v_req.id) then
    insert into public.payouts (traveller_id, request_id, amount, status)
    values (v_req.matched_traveller_id, v_req.id, greatest(v_gross - round(v_gross * v_fee_pct / 100, 2), 0), 'pending');
  end if;

  update public.traveller_profiles
     set total_deliveries = total_deliveries + 1
   where id = v_req.matched_traveller_id;
end;
$$;

create or replace function public.raise_dispute(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'Tell us what went wrong'; end if;
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found or not public.is_request_participant(p_request_id) then
    raise exception 'Request not found';
  end if;
  if v_req.status not in ('paid', 'dropped_off', 'handed_to_traveller', 'in_transit', 'delivered') then
    raise exception 'A dispute can only be opened once payment is in escrow and before it is released';
  end if;
  insert into public.disputes (request_id, raised_by, reason) values (v_req.id, auth.uid(), trim(p_reason));
  update public.delivery_requests set status = 'disputed' where id = v_req.id;
end;
$$;

---------------------------------------------------------------------------
-- 6. Ratings: only between the two parties of a completed delivery, once each
---------------------------------------------------------------------------
create unique index if not exists ratings_one_per_party on public.ratings(request_id, from_user_id);

create or replace function public.validate_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_traveller_user uuid;
begin
  select * into v_req from public.delivery_requests where id = new.request_id;
  if not found or v_req.status <> 'completed' then
    raise exception 'You can only rate a completed delivery';
  end if;
  select user_id into v_traveller_user from public.traveller_profiles where id = v_req.matched_traveller_id;
  if not (
    (new.from_user_id = v_req.sender_id and new.to_user_id = v_traveller_user) or
    (new.from_user_id = v_traveller_user and new.to_user_id = v_req.sender_id)
  ) then
    raise exception 'Ratings are only allowed between the sender and traveler of this delivery';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_rating on public.ratings;
create trigger validate_rating before insert on public.ratings
  for each row execute function public.validate_rating();

-- Rate the other party of a completed delivery (sender <-> traveler), once each.
create or replace function public.rate_request(p_request_id uuid, p_rating integer, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_traveller_user uuid;
  v_to uuid;
begin
  select * into v_req from public.delivery_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  select user_id into v_traveller_user from public.traveller_profiles where id = v_req.matched_traveller_id;

  if auth.uid() = v_req.sender_id then v_to := v_traveller_user;
  elsif auth.uid() = v_traveller_user then v_to := v_req.sender_id;
  else raise exception 'Request not found';
  end if;

  insert into public.ratings (request_id, from_user_id, to_user_id, rating, comment)
  values (p_request_id, auth.uid(), v_to, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
exception when unique_violation then
  raise exception 'You already rated this delivery';
end;
$$;

create or replace function public.refresh_traveller_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.traveller_profiles
     set rating = (select round(avg(r.rating)::numeric, 2) from public.ratings r where r.to_user_id = new.to_user_id)
   where user_id = new.to_user_id;
  return new;
end;
$$;
drop trigger if exists refresh_traveller_rating on public.ratings;
create trigger refresh_traveller_rating after insert on public.ratings
  for each row execute function public.refresh_traveller_rating();

---------------------------------------------------------------------------
-- 7. Delete safety (so the delete buttons can't destroy money records)
---------------------------------------------------------------------------
-- Non-admins may only delete their own requests before payment.
-- (Completed requests stay as the traveler's earnings/rating history.)
create policy delivery_requests_delete_guard on public.delivery_requests
  as restrictive for delete to authenticated
  using (
    public.is_admin()
    or (sender_id = auth.uid()
        and status in ('draft', 'submitted', 'matched', 'accepted_by_traveller', 'cancelled'))
  );

-- Give reserved kg back when an unpaid request is deleted.
create or replace function public.release_trip_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.trip_id is not null and old.status in ('matched', 'accepted_by_traveller', 'paid') then
    update public.trips set available_kg = least(capacity_kg, available_kg + old.weight_kg)
     where id = old.trip_id;
  end if;
  return old;
end;
$$;
drop trigger if exists release_trip_capacity on public.delivery_requests;
create trigger release_trip_capacity before delete on public.delivery_requests
  for each row execute function public.release_trip_capacity();

-- A trip with money in flight can't be deleted; unpaid bookings go back to the open board.
create or replace function public.guard_trip_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.delivery_requests
     where trip_id = old.id
       and status in ('paid', 'dropped_off', 'handed_to_traveller', 'in_transit', 'delivered', 'disputed')
  ) then
    raise exception 'This trip has a delivery in progress and cannot be deleted';
  end if;

  update public.matches set status = 'rejected'
   where status in ('pending', 'accepted')
     and request_id in (
       select id from public.delivery_requests
        where trip_id = old.id and status in ('matched', 'accepted_by_traveller'));

  update public.delivery_requests
     set status = 'submitted', matched_traveller_id = null, trip_id = null, agreed_price = null
   where trip_id = old.id and status in ('matched', 'accepted_by_traveller');

  return old;
end;
$$;
drop trigger if exists guard_trip_delete on public.trips;
create trigger guard_trip_delete before delete on public.trips
  for each row execute function public.guard_trip_delete();

---------------------------------------------------------------------------
-- 8. Function permissions
---------------------------------------------------------------------------
revoke all on function public.browse_open_trips() from public, anon;
revoke all on function public.browse_open_requests() from public, anon;
revoke all on function public.get_request_counterparty(uuid) from public, anon;
revoke all on function public.book_trip(uuid, text, text, numeric, numeric, text[]) from public, anon;
revoke all on function public.claim_request(uuid, uuid) from public, anon;
revoke all on function public.decline_match(uuid) from public, anon;
revoke all on function public.cancel_request(uuid) from public, anon;
revoke all on function public.fund_escrow(uuid) from public, anon;
revoke all on function public.confirm_receipt(uuid) from public, anon;
revoke all on function public.raise_dispute(uuid, text) from public, anon;
revoke all on function public.rate_request(uuid, integer, text) from public, anon;

grant execute on function public.browse_open_trips() to authenticated;
grant execute on function public.browse_open_requests() to authenticated;
grant execute on function public.get_request_counterparty(uuid) to authenticated;
grant execute on function public.book_trip(uuid, text, text, numeric, numeric, text[]) to authenticated;
grant execute on function public.claim_request(uuid, uuid) to authenticated;
grant execute on function public.decline_match(uuid) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.fund_escrow(uuid) to authenticated;
grant execute on function public.confirm_receipt(uuid) to authenticated;
grant execute on function public.raise_dispute(uuid, text) to authenticated;
grant execute on function public.rate_request(uuid, integer, text) to authenticated;
