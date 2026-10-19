-- Keep deals on Eban: chat and handover contact unlock only after payment is confirmed,
-- and matches that are not paid within 48 hours are released.

-- 1. Statuses where the sender's money is with Eban, so the two people may talk.
create or replace function public.request_chat_open(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.delivery_requests dr
    where dr.id = p_request_id
      and dr.status in ('paid', 'dropped_off', 'handed_to_traveller', 'in_transit', 'delivered', 'completed', 'disputed')
  );
$$;

drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
create policy messages_select on public.messages for select
  using (public.is_request_participant(request_id) and public.request_chat_open(request_id));
create policy messages_insert on public.messages for insert
  with check (author_id = auth.uid() and public.is_request_participant(request_id) and public.request_chat_open(request_id));

-- 2. The other person's first name and phone, only once the request is paid.
create or replace function public.get_handover_contact(p_request_id uuid)
returns table (counterparty_role text, first_name text, phone text)
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
  if v_req.status not in ('paid', 'dropped_off', 'handed_to_traveller', 'in_transit', 'delivered', 'completed', 'disputed') then
    return;
  end if;
  select * into v_tp from public.traveller_profiles where id = v_req.matched_traveller_id;

  if v_req.sender_id = auth.uid() then
    if v_tp.id is null then return; end if;
    return query select 'traveller'::text, split_part(coalesce(v_tp.name, 'Traveler'), ' ', 1), v_tp.phone;
  elsif v_tp.user_id = auth.uid() then
    return query select 'sender'::text, split_part(coalesce(p.full_name, 'Sender'), ' ', 1), p.phone
      from public.profiles p where p.id = v_req.sender_id;
  end if;
end;
$$;
revoke all on function public.get_handover_contact(uuid) from public, anon;
grant execute on function public.get_handover_contact(uuid) to authenticated;

-- 3. When did the match happen? Needed to release unpaid matches.
alter table public.delivery_requests add column if not exists matched_at timestamptz;
update public.delivery_requests set matched_at = now() where matched_traveller_id is not null and matched_at is null;

create or replace function public.set_matched_at()
returns trigger
language plpgsql
as $$
begin
  if new.matched_traveller_id is null then
    new.matched_at := null;
  elsif tg_op = 'INSERT' or old.matched_traveller_id is distinct from new.matched_traveller_id then
    new.matched_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists set_matched_at on public.delivery_requests;
create trigger set_matched_at before insert or update on public.delivery_requests
for each row execute function public.set_matched_at();

-- 4. Release matches that were never paid.
create or replace function public.expire_stale_matches(p_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select * from public.delivery_requests dr
    where dr.status in ('matched', 'accepted_by_traveller')
      and dr.matched_at is not null
      and dr.matched_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.payments p where p.request_id = dr.id)
    for update
  loop
    if r.trip_id is not null then
      update public.trips set available_kg = least(capacity_kg, available_kg + r.weight_kg) where id = r.trip_id;
    end if;
    update public.matches set status = 'rejected' where request_id = r.id and status in ('pending', 'accepted');
    update public.delivery_requests set status = 'cancelled' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.expire_stale_matches(integer) from public, anon;
grant execute on function public.expire_stale_matches(integer) to authenticated;

-- Run it every hour when pg_cron is available. The app also triggers it, so this is a bonus.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-stale-matches', '0 * * * *', 'select public.expire_stale_matches(48)');
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;
