-- Eban service fee, paid by the sender on top of the traveler's price.
--   fee = greatest(price * fee_percent / 100, fee_minimum)
-- The traveler is still paid 100% of the agreed price. Admins edit the two numbers
-- in Admin > Fees. The fee is locked onto each payment when the sender reports it,
-- so changing the rate later never alters a payment that is already in progress.
-- Run after 20261017000000_manual_payments.sql.

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),            -- single-row table
  fee_percent numeric not null default 15 check (fee_percent >= 0 and fee_percent <= 50),
  fee_minimum numeric not null default 5 check (fee_minimum >= 0 and fee_minimum <= 1000),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to authenticated;
grant update (fee_percent, fee_minimum, updated_at) on public.platform_settings to authenticated;

drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated using (true);
drop policy if exists platform_settings_update on public.platform_settings;
create policy platform_settings_update on public.platform_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.payments add column if not exists service_fee numeric not null default 0;

create or replace function public.service_fee_for(p_price numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when p_price is null or p_price <= 0 then 0
              else greatest(round(p_price * s.fee_percent / 100, 2), s.fee_minimum) end
  from public.platform_settings s
  where s.id;
$$;
revoke all on function public.service_fee_for(numeric) from public, anon;
grant execute on function public.service_fee_for(numeric) to authenticated;

-- The sender's payment now covers price + service fee. agreed_price stays the
-- traveler's price, so the payout in confirm_receipt is unchanged.
create or replace function public.report_payment_sent(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.delivery_requests%rowtype;
  v_amount numeric;
  v_fee numeric;
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

  v_fee := coalesce(public.service_fee_for(v_amount), 0);

  insert into public.payments (request_id, sender_id, amount, service_fee, status)
  values (v_req.id, v_req.sender_id, v_amount + v_fee, v_fee, 'pending');
  update public.delivery_requests set agreed_price = v_amount where id = v_req.id;
end;
$$;

revoke all on function public.report_payment_sent(uuid) from public, anon;
grant execute on function public.report_payment_sent(uuid) to authenticated;
