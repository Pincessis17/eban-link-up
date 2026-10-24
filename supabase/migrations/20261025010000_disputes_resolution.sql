-- "I have not received my item" report for senders, and a way for the Eban team to resolve any dispute.
-- Run after 20261025000000_chat_from_match.sql.

alter table public.disputes add column if not exists kind text not null default 'general';
alter table public.disputes add column if not exists admin_note text;
alter table public.disputes add column if not exists resolved_at timestamptz;
alter table public.disputes add column if not exists resolved_by uuid;

-- Sender says the traveller marked the parcel delivered, but it never arrived.
create or replace function public.report_not_received(p_request_id uuid, p_details text default null)
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
  if v_req.status <> 'delivered' then
    raise exception 'You can report a missing item once the traveler has marked it delivered';
  end if;
  insert into public.disputes (request_id, raised_by, reason, kind)
  values (v_req.id, auth.uid(),
          'Item not received after the traveler marked it delivered.' || coalesce(' Sender says: ' || nullif(trim(p_details), ''), ''),
          'not_received');
  update public.delivery_requests set status = 'disputed' where id = v_req.id;
end;
$$;

-- Eban team closes a dispute. Outcomes:
--   release            the parcel arrived: pay the traveller as normal
--   refund             the parcel did not arrive: the sender gets their payment back
--   back_to_delivered  new information: let the sender confirm or report again
create or replace function public.admin_resolve_dispute(p_request_id uuid, p_outcome text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Only admins can resolve disputes'; end if;
  if p_outcome not in ('release', 'refund', 'back_to_delivered') then raise exception 'Unknown outcome'; end if;
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_req.status <> 'disputed' then raise exception 'This request has no open dispute'; end if;

  if p_outcome = 'release' then
    update public.delivery_requests set status = 'completed', pickup_confirmed_at = now() where id = v_req.id;
    update public.payments set status = 'released' where request_id = v_req.id and status = 'held';
    if not exists (select 1 from public.payouts where request_id = v_req.id) then
      insert into public.payouts (traveller_id, request_id, amount, status)
      values (v_req.matched_traveller_id, v_req.id, greatest(coalesce(v_req.agreed_price, 0), 0), 'pending');
      update public.traveller_profiles set total_deliveries = total_deliveries + 1 where id = v_req.matched_traveller_id;
    end if;
  elsif p_outcome = 'refund' then
    update public.delivery_requests set status = 'cancelled' where id = v_req.id;
    update public.payments set status = 'refunded' where request_id = v_req.id and status = 'held';
  else
    update public.delivery_requests set status = 'delivered' where id = v_req.id;
  end if;

  update public.disputes
     set status = 'resolved', resolution = p_outcome, admin_note = nullif(trim(coalesce(p_note, '')), ''),
         resolved_at = now(), resolved_by = auth.uid()
   where request_id = v_req.id and status = 'open';
end;
$$;

revoke all on function public.report_not_received(uuid, text) from public, anon;
revoke all on function public.admin_resolve_dispute(uuid, text, text) from public, anon;
grant execute on function public.report_not_received(uuid, text) to authenticated;
grant execute on function public.admin_resolve_dispute(uuid, text, text) to authenticated;
