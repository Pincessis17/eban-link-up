-- Profile pages: people can see the ratings they received and the profile of whoever they deal with.
-- A profile is visible to its owner, to admins, and to the other person on a shared request.

create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    auth.uid() = p_user_id
    or public.is_admin()
    or exists (
      select 1 from public.delivery_requests dr
      left join public.traveller_profiles tp on tp.id = dr.matched_traveller_id
      where (dr.sender_id = auth.uid() and tp.user_id = p_user_id)
         or (dr.sender_id = p_user_id and tp.user_id = auth.uid())
    )
  );
$$;

-- The other person on a request, so a "View profile" button can open their page.
create or replace function public.counterparty_user_id(p_request_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_trav uuid;
begin
  select * into v_req from public.delivery_requests where id = p_request_id;
  if not found then return null; end if;
  select user_id into v_trav from public.traveller_profiles where id = v_req.matched_traveller_id;
  if v_req.sender_id = auth.uid() then return v_trav; end if;
  if v_trav = auth.uid() then return v_req.sender_id; end if;
  return null;
end;
$$;

create or replace function public.get_profile(p_user_id uuid)
returns table (
  user_id uuid, first_name text, full_name text, is_self boolean, avg_rating numeric, rating_count integer,
  parcels_sent integer, parcels_carried integer, verified boolean, member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_view_profile(p_user_id) then return; end if;
  return query
  select
    p_user_id,
    split_part(coalesce(pr.full_name, 'Member'), ' ', 1),
    case when auth.uid() = p_user_id or public.is_admin() then pr.full_name end,
    auth.uid() = p_user_id,
    (select round(avg(r.rating)::numeric, 2) from public.ratings r where r.to_user_id = p_user_id),
    (select count(*)::integer from public.ratings r where r.to_user_id = p_user_id),
    (select count(*)::integer from public.delivery_requests dr where dr.sender_id = p_user_id and dr.status = 'completed'),
    (select count(*)::integer from public.delivery_requests dr
       join public.traveller_profiles tp on tp.id = dr.matched_traveller_id
      where tp.user_id = p_user_id and dr.status = 'completed'),
    coalesce((select tp.verification_status = 'approved' from public.traveller_profiles tp where tp.user_id = p_user_id), false),
    (select u.created_at from auth.users u where u.id = p_user_id)
  from public.profiles pr where pr.id = p_user_id;
end;
$$;

create or replace function public.get_reviews(p_user_id uuid)
returns table (rating integer, comment text, created_at timestamptz, reviewer_first_name text, reviewer_role text, route text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_view_profile(p_user_id) then return; end if;
  return query
  select r.rating, r.comment, r.created_at,
         split_part(coalesce(pr.full_name, 'Member'), ' ', 1),
         case when r.from_user_id = dr.sender_id then 'sender' else 'traveller' end,
         dr.origin_city || ' to ' || dr.destination_city
  from public.ratings r
  join public.delivery_requests dr on dr.id = r.request_id
  left join public.profiles pr on pr.id = r.from_user_id
  where r.to_user_id = p_user_id
  order by r.created_at desc;
end;
$$;

-- Handover phone: use the traveller's own profile phone when the traveller row has none.
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
    return query select 'traveller'::text, split_part(coalesce(v_tp.name, 'Traveler'), ' ', 1),
      coalesce(nullif(v_tp.phone, ''), (select p.phone from public.profiles p where p.id = v_tp.user_id));
  elsif v_tp.user_id = auth.uid() then
    return query select 'sender'::text, split_part(coalesce(p.full_name, 'Sender'), ' ', 1), p.phone
      from public.profiles p where p.id = v_req.sender_id;
  end if;
end;
$$;

revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.counterparty_user_id(uuid) from public, anon;
revoke all on function public.get_profile(uuid) from public, anon;
revoke all on function public.get_reviews(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.counterparty_user_id(uuid) to authenticated;
grant execute on function public.get_profile(uuid) to authenticated;
grant execute on function public.get_reviews(uuid) to authenticated;
