-- Admin delete support.
--
-- 1. verifications had no DELETE policy, so admins couldn't remove rows.
-- 2. traveller_profiles can't be deleted directly because delivery_requests
--    (matched_traveller_id) and payouts (traveller_id) reference it with
--    NO ACTION. admin_delete_traveller() handles those safely:
--      * refuses if the traveller has payouts or a delivery in flight
--        (paid / dropped_off / handed_to_traveller / in_transit)
--      * puts matched / accepted requests back to 'submitted' so they can be
--        re-matched, and clears the traveller from finished requests
--      * then deletes the profile (trips, matches, verifications cascade).
--    The person's login account (auth.users / profiles) is NOT deleted.

create policy verifications_admin_delete on public.verifications
  for delete using (public.is_admin());

create or replace function public.admin_delete_traveller(p_traveller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete travelers';
  end if;

  if exists (select 1 from payouts where traveller_id = p_traveller_id) then
    raise exception 'This traveler has payout records and cannot be deleted';
  end if;

  if exists (
    select 1 from delivery_requests
    where matched_traveller_id = p_traveller_id
      and status in ('paid', 'dropped_off', 'handed_to_traveller', 'in_transit')
  ) then
    raise exception 'This traveler has a delivery in progress and cannot be deleted';
  end if;

  update delivery_requests
     set matched_traveller_id = null, status = 'submitted'
   where matched_traveller_id = p_traveller_id
     and status in ('matched', 'accepted_by_traveller');

  update delivery_requests
     set matched_traveller_id = null
   where matched_traveller_id = p_traveller_id;

  delete from traveller_profiles where id = p_traveller_id;
end;
$$;

revoke all on function public.admin_delete_traveller(uuid) from public, anon;
grant execute on function public.admin_delete_traveller(uuid) to authenticated;
