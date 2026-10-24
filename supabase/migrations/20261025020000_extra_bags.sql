-- Extra baggage escrow. Optional: when a sender needs more space than the traveller has, the traveller
-- flags an extra bag. Eban reviews and plans it. The sender pays the full bag cost, the traveller's
-- compensation and Eban's percentage (on the compensation only) into escrow.
--   paid out early:   half of the bag cost (the traveller covers the other half)
--   paid after delivery: the other half of the bag cost + the compensation
-- Run after 20261025010000_disputes_resolution.sql.

create table if not exists public.extra_bags (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.delivery_requests(id) on delete cascade,
  traveller_id uuid not null references public.traveller_profiles(id),
  sender_id uuid not null references public.profiles(id),
  bag_cost numeric(10,2) not null check (bag_cost > 0 and bag_cost <= 2000),
  compensation numeric(10,2) not null default 0 check (compensation >= 0 and compensation <= 2000),
  service_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,            -- what the sender pays
  advance_amount numeric(10,2) not null,   -- sent to the traveller early
  final_amount numeric(10,2) not null,     -- sent after delivery
  note text,
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'payment_pending', 'held', 'advance_sent', 'settled', 'cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  advance_sent_at timestamptz,
  settled_at timestamptz,
  cancelled_at timestamptz
);
create unique index if not exists extra_bags_one_active_per_request
  on public.extra_bags (request_id) where status <> 'cancelled';

alter table public.extra_bags enable row level security;
revoke all on public.extra_bags from anon, authenticated;
grant select on public.extra_bags to authenticated;

drop policy if exists extra_bags_select on public.extra_bags;
create policy extra_bags_select on public.extra_bags for select using (
  public.is_admin()
  or sender_id = auth.uid()
  or exists (select 1 from public.traveller_profiles tp where tp.id = extra_bags.traveller_id and tp.user_id = auth.uid())
);

-- Traveller flags that the parcel needs an extra bag.
create or replace function public.propose_extra_bag(
  p_request_id uuid, p_bag_cost numeric, p_compensation numeric, p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_tp public.traveller_profiles%rowtype;
  v_pct numeric;
  v_comp numeric := round(coalesce(p_compensation, 0), 2);
  v_cost numeric := round(coalesce(p_bag_cost, 0), 2);
  v_fee numeric;
  v_advance numeric;
  v_id uuid;
begin
  select * into v_req from public.delivery_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  select * into v_tp from public.traveller_profiles where id = v_req.matched_traveller_id;
  if v_tp.id is null or v_tp.user_id <> auth.uid() then raise exception 'Only the matched traveler can flag an extra bag'; end if;
  if v_req.status not in ('accepted_by_traveller', 'paid') then
    raise exception 'An extra bag can be flagged after you accept and before the parcel is handed over';
  end if;
  if v_cost <= 0 then raise exception 'Enter the cost of the extra bag'; end if;
  if v_comp < 0 then raise exception 'Compensation cannot be negative'; end if;
  if exists (select 1 from public.extra_bags where request_id = p_request_id and status <> 'cancelled') then
    raise exception 'An extra bag is already in progress for this request';
  end if;

  select s.fee_percent into v_pct from public.platform_settings s where s.id;
  v_fee := round(v_comp * coalesce(v_pct, 0) / 100, 2);   -- percentage on the compensation only
  v_advance := round(v_cost / 2, 2);

  insert into public.extra_bags (request_id, traveller_id, sender_id, bag_cost, compensation, service_fee, total,
                                 advance_amount, final_amount, note)
  values (p_request_id, v_tp.id, v_req.sender_id, v_cost, v_comp, v_fee, v_cost + v_comp + v_fee,
          v_advance, (v_cost - v_advance) + v_comp, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Eban reviews the plan.
create or replace function public.admin_review_extra_bag(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can review extra bags'; end if;
  update public.extra_bags
     set status = case when p_approve then 'approved' else 'cancelled' end,
         approved_at = case when p_approve then now() else approved_at end,
         cancelled_at = case when p_approve then cancelled_at else now() end,
         admin_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id and status = 'proposed';
  if not found then raise exception 'This extra bag is not waiting for review'; end if;
end;
$$;

-- Sender says the money has been sent.
create or replace function public.report_extra_bag_payment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.extra_bags set status = 'payment_pending'
   where id = p_id and sender_id = auth.uid() and status = 'approved';
  if not found then raise exception 'Nothing to pay for this extra bag yet'; end if;
end;
$$;

create or replace function public.admin_confirm_extra_bag_payment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can confirm payments'; end if;
  update public.extra_bags set status = 'held', paid_at = now() where id = p_id and status = 'payment_pending';
  if not found then raise exception 'No pending payment for this extra bag'; end if;
end;
$$;

-- Eban has sent the early half of the bag cost to the traveller.
create or replace function public.admin_mark_extra_bag_advance(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can do this'; end if;
  update public.extra_bags set status = 'advance_sent', advance_sent_at = now() where id = p_id and status = 'held';
  if not found then raise exception 'The money is not in escrow yet'; end if;
end;
$$;

-- After delivery: Eban has paid the traveller the rest. Returns what was owed.
create or replace function public.admin_settle_extra_bag(p_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.extra_bags%rowtype;
  v_status text;
  v_owed numeric;
begin
  if not public.is_admin() then raise exception 'Only admins can do this'; end if;
  select * into b from public.extra_bags where id = p_id for update;
  if not found or b.status not in ('held', 'advance_sent') then raise exception 'This extra bag cannot be settled'; end if;
  select status into v_status from public.delivery_requests where id = b.request_id;
  if v_status <> 'completed' then raise exception 'Wait until the sender confirms the delivery'; end if;
  v_owed := case when b.status = 'advance_sent' then b.final_amount else b.bag_cost + b.compensation end;
  update public.extra_bags set status = 'settled', settled_at = now() where id = p_id;
  return v_owed;
end;
$$;

-- Cancel: traveller or sender before payment, admin at any point before settlement.
-- If money was already held, Eban refunds the sender by hand.
create or replace function public.cancel_extra_bag(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.extra_bags%rowtype;
  v_is_traveller boolean;
begin
  select * into b from public.extra_bags where id = p_id for update;
  if not found then raise exception 'Extra bag not found'; end if;
  select exists (select 1 from public.traveller_profiles tp where tp.id = b.traveller_id and tp.user_id = auth.uid()) into v_is_traveller;
  if public.is_admin() then
    if b.status in ('settled', 'cancelled') then raise exception 'This extra bag is already closed'; end if;
  elsif (b.sender_id = auth.uid() or v_is_traveller) then
    if b.status not in ('proposed', 'approved') then
      raise exception 'Once payment has been sent, contact EBAN to cancel';
    end if;
  else
    raise exception 'Extra bag not found';
  end if;
  update public.extra_bags set status = 'cancelled', cancelled_at = now(),
         admin_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), admin_note)
   where id = p_id;
end;
$$;

revoke all on function public.propose_extra_bag(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.admin_review_extra_bag(uuid, boolean, text) from public, anon;
revoke all on function public.report_extra_bag_payment(uuid) from public, anon;
revoke all on function public.admin_confirm_extra_bag_payment(uuid) from public, anon;
revoke all on function public.admin_mark_extra_bag_advance(uuid) from public, anon;
revoke all on function public.admin_settle_extra_bag(uuid) from public, anon;
revoke all on function public.cancel_extra_bag(uuid, text) from public, anon;
grant execute on function public.propose_extra_bag(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.admin_review_extra_bag(uuid, boolean, text) to authenticated;
grant execute on function public.report_extra_bag_payment(uuid) to authenticated;
grant execute on function public.admin_confirm_extra_bag_payment(uuid) to authenticated;
grant execute on function public.admin_mark_extra_bag_advance(uuid) to authenticated;
grant execute on function public.admin_settle_extra_bag(uuid) to authenticated;
grant execute on function public.cancel_extra_bag(uuid, text) to authenticated;
