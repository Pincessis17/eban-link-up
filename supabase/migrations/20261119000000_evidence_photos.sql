-- Proof of payment and delivery photos.
-- * Sender attaches a screenshot/receipt of the transfer before saying "I've paid".
-- * Traveller takes a photo when collecting the parcel and again when delivering it.
-- Sender, matched traveller and admins can see them. Nobody can edit or delete them (admins can delete).
-- Safe to run more than once.

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-evidence', 'request-evidence', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Turns text into an id, or nothing if it isn't one (so a badly named file can't cause errors).
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable
as $$ begin return p::uuid; exception when others then return null; end $$;

-- Is the signed-in person the sender or the matched traveller of this request?
create or replace function public.is_request_party(p_request uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.delivery_requests dr
    left join public.traveller_profiles tp on tp.id = dr.matched_traveller_id
    where dr.id = p_request and (dr.sender_id = auth.uid() or tp.user_id = auth.uid())
  )
$$;
revoke all on function public.is_request_party(uuid) from public, anon;
grant execute on function public.is_request_party(uuid) to authenticated;

-- Files live at  <uploader id>/<request id>/<kind>-<time>.<ext>   (kind = payment_proof / handover_photo / delivery_photo)
drop policy if exists request_evidence_insert on storage.objects;
create policy request_evidence_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_request_party(public.try_uuid((storage.foldername(name))[2]))
  );
drop policy if exists request_evidence_select on storage.objects;
create policy request_evidence_select on storage.objects for select to authenticated
  using (
    bucket_id = 'request-evidence'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      -- payment receipts can show bank details: only the sender who uploaded them (and admins) may see them
      or (public.is_request_party(public.try_uuid((storage.foldername(name))[2])) and storage.filename(name) not like 'payment_proof-%')
    )
  );
drop policy if exists request_evidence_admin_delete on storage.objects;
create policy request_evidence_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'request-evidence' and public.is_admin());

-- ---------------------------------------------------------------- the record of each file
create table if not exists public.request_evidence (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.delivery_requests(id) on delete cascade,
  kind text not null check (kind in ('payment_proof', 'handover_photo', 'delivery_photo')),
  file_path text not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists request_evidence_request_idx on public.request_evidence (request_id, kind);
create index if not exists request_evidence_uploader_idx on public.request_evidence (uploaded_by);

alter table public.request_evidence enable row level security;
drop policy if exists request_evidence_read on public.request_evidence;
create policy request_evidence_read on public.request_evidence for select to authenticated
  using (public.is_admin() or uploaded_by = auth.uid() or (kind <> 'payment_proof' and public.is_request_party(request_id)));
drop policy if exists request_evidence_admin_delete on public.request_evidence;
create policy request_evidence_admin_delete on public.request_evidence for delete to authenticated
  using (public.is_admin());
revoke insert, update on public.request_evidence from anon, authenticated;
grant select, delete on public.request_evidence to authenticated;

-- Records an uploaded file. Checks who may add what, and when.
create or replace function public.add_request_evidence(p_request uuid, p_kind text, p_path text, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  r public.delivery_requests;
  v_trav uuid;
  v_id uuid;
begin
  select * into r from public.delivery_requests where id = p_request;
  if not found then raise exception 'Request not found'; end if;
  v_trav := (select user_id from public.traveller_profiles where id = r.matched_traveller_id);

  if p_path is null or p_path not like auth.uid()::text || '/' || p_request::text || '/' || p_kind || '-%' then
    raise exception 'That file does not belong to this request';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'request-evidence' and name = p_path and owner_id = auth.uid()::text) then
    raise exception 'Upload the file first';
  end if;

  if p_kind = 'payment_proof' then
    if auth.uid() <> r.sender_id then raise exception 'Only the sender can add proof of payment'; end if;
    if r.status <> 'accepted_by_traveller' then raise exception 'This request is not waiting for payment'; end if;
  elsif p_kind = 'handover_photo' then
    if auth.uid() is distinct from v_trav then raise exception 'Only the traveller can add the collection photo'; end if;
    if r.status not in ('paid', 'dropped_off') then raise exception 'You can add the collection photo once the request is paid'; end if;
  elsif p_kind = 'delivery_photo' then
    if auth.uid() is distinct from v_trav then raise exception 'Only the traveller can add the delivery photo'; end if;
    if r.status not in ('handed_to_traveller', 'in_transit') then raise exception 'You can add the delivery photo once you have the parcel'; end if;
  else
    raise exception 'Unknown kind of file';
  end if;

  insert into public.request_evidence (request_id, kind, file_path, uploaded_by, note)
  values (p_request, p_kind, p_path, auth.uid(), nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$function$;
revoke all on function public.add_request_evidence(uuid, text, text, text) from public, anon;
grant execute on function public.add_request_evidence(uuid, text, text, text) to authenticated;

create or replace function public.has_evidence(p_request uuid, p_kind text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.request_evidence where request_id = p_request and kind = p_kind) $$;
revoke all on function public.has_evidence(uuid, text) from public, anon;
grant execute on function public.has_evidence(uuid, text) to authenticated;

-- ---------------------------------------------------------------- make them required
-- 1. "I've paid" needs a proof of payment.
create or replace function public.report_payment_sent(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
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
  if not public.has_evidence(v_req.id, 'payment_proof') then
    raise exception 'Please attach a screenshot or receipt of your payment first';
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
$function$;

-- 2. Collecting needs a collection photo; delivering needs a delivery photo.
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
      if new.status = 'handed_to_traveller' and not public.has_evidence(new.id, 'handover_photo') then
        raise exception 'Take a photo of the parcel when you collect it first';
      end if;
      if new.status = 'delivered' and not public.has_evidence(new.id, 'delivery_photo') then
        raise exception 'Take a photo of the parcel at delivery first';
      end if;
    else
      raise exception 'That status can only be set through the app''s actions';
    end if;
  end if;

  if new.status = 'delivered' and old.status <> 'delivered' then
    new.delivered_at := now();
  end if;
  return new;
end;
$function$;

-- ---------------------------------------------------------------- notifications
create or replace function public.notify_new_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare r public.delivery_requests;
begin
  select * into r from public.delivery_requests where id = new.request_id;
  if new.kind = 'handover_photo' then
    perform public.notify(r.sender_id, 'evidence', 'Collection photo added',
      'Your traveller photographed the ' || public.request_label(r) || ' when collecting it.', '/sender/requests/' || r.id, r.id);
  elsif new.kind = 'delivery_photo' then
    perform public.notify(r.sender_id, 'evidence', 'Delivery photo added',
      'Your traveller photographed the ' || public.request_label(r) || ' at delivery.', '/sender/requests/' || r.id, r.id);
  end if;
  return new;
end;
$function$;
revoke all on function public.notify_new_evidence() from public, anon, authenticated;
drop trigger if exists notify_new_evidence on public.request_evidence;
create trigger notify_new_evidence after insert on public.request_evidence
  for each row execute function public.notify_new_evidence();
