-- Chat opens as soon as a sender and traveller are matched, so they can ask questions before the
-- traveller accepts and before anyone pays. The phone number for calls appears once the traveller accepts.
-- Run after 20261019060000_profiles_and_reviews.sql.

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
      and dr.matched_traveller_id is not null
      and dr.status in ('matched', 'accepted_by_traveller', 'paid', 'dropped_off', 'handed_to_traveller',
                        'in_transit', 'delivered', 'completed', 'disputed')
  );
$$;

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
  if v_req.status not in ('accepted_by_traveller', 'paid', 'dropped_off', 'handed_to_traveller',
                          'in_transit', 'delivered', 'completed', 'disputed') then
    return;
  end if;
  select * into v_tp from public.traveller_profiles where id = v_req.matched_traveller_id;

  if v_req.sender_id = auth.uid() then
    if v_tp.id is null then return; end if;
    return query select 'traveller'::text, split_part(coalesce(v_tp.name, 'Traveler'), ' ', 1),
      coalesce(nullif(v_tp.phone, ''), (select p.phone from public.profiles p where p.id = v_tp.user_id));
  elsif v_tp.user_id = auth.uid() then
    return query select 'sender'::text, split_part(coalesce(p.full_name, 'Sender'), ' ', 1), p.phone
      from public.profiles p where p.id = v_req.sender_id;
  end if;
end;
$$;
