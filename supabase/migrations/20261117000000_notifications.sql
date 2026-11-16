-- In-app notifications.
-- Every important event creates a row in public.notifications for the right person,
-- plus hourly reminders (accept, pay, auto-release warning) and admin alerts.
-- Safe to run more than once.

-- ---------------------------------------------------------------- table
alter table public.notifications
  add column if not exists title text,
  add column if not exists link text,
  add column if not exists request_id uuid references public.delivery_requests(id) on delete cascade,
  add column if not exists email_sent_at timestamptz;

alter table public.notifications alter column read_status set default false;
update public.notifications set read_status = false where read_status is null;
alter table public.notifications alter column read_status set not null;
alter table public.notifications alter column created_at set default now();

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where not read_status;
create index if not exists notifications_request_idx on public.notifications (request_id);

-- People may read and mark their own notifications as read, and delete them. Only the database creates them.
drop policy if exists notifications_write on public.notifications;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_status) on public.notifications to authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_message text, p_link text default null, p_request uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_user is null then return; end if;
  -- Nobody needs to be told about something they just did themselves.
  if p_user = auth.uid() then return; end if;
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  insert into public.notifications (user_id, type, title, message, link, request_id, read_status)
  values (p_user, p_type, p_title, p_message, p_link, p_request, false);
end;
$function$;

create or replace function public.notify_admins(
  p_type text, p_title text, p_message text, p_link text default null, p_request uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare a uuid;
begin
  for a in select id from public.profiles where role = 'Admin' loop
    perform public.notify(a, p_type, p_title, p_message, p_link, p_request);
  end loop;
end;
$function$;

-- The person behind a traveller profile
create or replace function public.traveller_user(p_traveller uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select user_id from public.traveller_profiles where id = p_traveller $$;

-- Where a traveller opens a request (their pages use the match id)
create or replace function public.traveller_request_link(p_request uuid, p_traveller uuid)
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select '/traveler/requests/' || m.id from public.matches m
      where m.request_id = p_request and m.traveller_id = p_traveller
      order by (m.status = 'accepted') desc, m.created_at desc limit 1),
    '/traveler/requests')
$$;

create or replace function public.request_label(r public.delivery_requests)
returns text language sql immutable
as $$ select coalesce(nullif(r.item_type, ''), 'parcel') || ' · ' || coalesce(r.origin_city, '?') || ' → ' || coalesce(r.destination_city, '?') $$;

revoke all on function public.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.notify_admins(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.traveller_user(uuid) from public, anon, authenticated;
revoke all on function public.traveller_request_link(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- delivery requests
create or replace function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_trav_id uuid := coalesce(new.matched_traveller_id, case when tg_op = 'UPDATE' then old.matched_traveller_id end);
  v_trav uuid := public.traveller_user(v_trav_id);
  v_s_link text := '/sender/requests/' || new.id;
  v_t_link text := public.traveller_request_link(new.id, v_trav_id);
  v_what text := public.request_label(new);
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
  when 'matched' then
    perform public.notify(v_trav, 'request_matched', 'New delivery request',
      'A sender wants you to carry their ' || v_what || '. Accept within 48 hours.', v_t_link, new.id);
    perform public.notify(new.sender_id, 'request_matched', 'Traveller found',
      'Your ' || v_what || ' is waiting for the traveller to accept.', v_s_link, new.id);

  when 'accepted_by_traveller' then
    perform public.notify(new.sender_id, 'request_accepted', 'Traveller accepted',
      'Your traveller accepted the ' || v_what || '. Pay soon: unpaid bookings are released 48 hours after booking.', v_s_link, new.id);

  when 'paid' then
    perform public.notify(new.sender_id, 'payment_confirmed', 'Payment confirmed',
      'Eban is holding your payment for the ' || v_what || '. Hand the parcel to your traveller.', v_s_link, new.id);
    perform public.notify(v_trav, 'payment_confirmed', 'Sender has paid',
      'The ' || v_what || ' is paid and held by Eban. Arrange the hand-over.', v_t_link, new.id);

  when 'handed_to_traveller' then
    perform public.notify(new.sender_id, 'status_update', 'Parcel collected',
      'Your traveller has the ' || v_what || '.', v_s_link, new.id);
    perform public.notify(v_trav, 'status_update', 'Hand-over recorded',
      'The ' || v_what || ' is marked as with you.', v_t_link, new.id);

  when 'in_transit' then
    perform public.notify(new.sender_id, 'status_update', 'On the way',
      'Your ' || v_what || ' is travelling.', v_s_link, new.id);

  when 'delivered' then
    perform public.notify(new.sender_id, 'delivered', 'Delivered',
      'Your ' || v_what || ' was delivered. Confirm it arrived, or report a problem within 72 hours.', v_s_link, new.id);

  when 'completed' then
    perform public.notify(v_trav, 'completed', 'Delivery complete',
      'The ' || v_what || ' is complete. Your payout is being prepared.', v_t_link, new.id);
    perform public.notify(new.sender_id, 'completed', 'Delivery complete',
      'The ' || v_what || ' is complete and the traveller is being paid. Thank you for using Eban.', v_s_link, new.id);

  when 'disputed' then
    perform public.notify(new.sender_id, 'disputed', 'Problem reported',
      'A problem was reported on the ' || v_what || '. Payment is on hold while Eban looks into it.', v_s_link, new.id);
    perform public.notify(v_trav, 'disputed', 'Problem reported',
      'A problem was reported on the ' || v_what || '. Payment is on hold while Eban looks into it.', v_t_link, new.id);
    perform public.notify_admins('dispute_opened', 'New dispute',
      'A problem was reported on the ' || v_what || '.', '/admin/disputes', new.id);

  when 'cancelled' then
    -- After a dispute the sender hears about the refund and the outcome instead.
    if not (tg_op = 'UPDATE' and old.status = 'disputed') then
      perform public.notify(new.sender_id, 'cancelled', 'Request cancelled',
        'The ' || v_what || ' was cancelled.', v_s_link, new.id);
    end if;
    if tg_op = 'UPDATE' and old.status in ('matched', 'accepted_by_traveller', 'paid', 'dropped_off', 'handed_to_traveller', 'in_transit', 'delivered', 'disputed') then
      perform public.notify(v_trav, 'cancelled', 'Request cancelled',
        'The ' || v_what || ' was cancelled.', v_t_link, new.id);
    end if;

  when 'submitted' then
    if tg_op = 'UPDATE' and old.status in ('matched', 'accepted_by_traveller') then
      perform public.notify(new.sender_id, 'traveller_declined', 'Traveller unavailable',
        'The traveller could not take your ' || v_what || '. It is open again, so you can pick another trip.', v_s_link, new.id);
    end if;

  else
    null;
  end case;
  return new;
end;
$function$;

drop trigger if exists notify_request_change on public.delivery_requests;
create trigger notify_request_change after insert or update of status on public.delivery_requests
  for each row execute function public.notify_request_change();

-- ---------------------------------------------------------------- payments and payouts
create or replace function public.notify_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare r public.delivery_requests;
begin
  select * into r from public.delivery_requests where id = new.request_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_admins('payment_to_confirm', 'Payment to confirm',
      'A sender says they have paid ' || coalesce(new.amount::text, '') || ' for ' || public.request_label(r) || '.', '/admin/payments', new.request_id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'refunded' then
    perform public.notify(new.sender_id, 'refunded', 'Refund sent',
      'Eban has refunded your payment for the ' || public.request_label(r) || '.', '/sender/requests/' || new.request_id, new.request_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_payment_change on public.payments;
create trigger notify_payment_change after insert or update of status on public.payments
  for each row execute function public.notify_payment_change();

create or replace function public.notify_payout_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform public.notify(public.traveller_user(new.traveller_id), 'payout_sent', 'Payout sent',
      'Eban has sent your payout of ' || coalesce(new.amount::text, '') || '.', '/traveler/earnings', new.request_id);
  elsif new.status = 'failed' and (tg_op = 'INSERT' or old.status is distinct from 'failed') then
    perform public.notify(public.traveller_user(new.traveller_id), 'payout_failed', 'Payout problem',
      'Your payout could not be sent. Check your payout details on your profile.', '/profile', new.request_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_payout_change on public.payouts;
create trigger notify_payout_change after insert or update of status on public.payouts
  for each row execute function public.notify_payout_change();

-- ---------------------------------------------------------------- ID and face checks
create or replace function public.notify_check_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_what text := case when tg_table_name = 'id_documents' then 'ID' else 'face check' end;
  v_admin text := case when tg_table_name = 'id_documents' then '/admin/verifications' else '/admin/identity' end;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_admins('check_to_review', 'New ' || v_what || ' to review',
      'Someone has submitted their ' || v_what || '.', v_admin, null);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.notify(new.user_id, 'check_approved', 'Your ' || v_what || ' is approved',
        'Eban has approved your ' || v_what || '.', '/profile', null);
    elsif new.status = 'rejected' then
      perform public.notify(new.user_id, 'check_rejected', 'Your ' || v_what || ' was declined',
        coalesce('Reason: ' || nullif(new.reviewer_note, ''), 'Please try again with a clearer upload.'), '/profile', null);
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_check_change on public.id_documents;
create trigger notify_check_change after insert or update of status on public.id_documents
  for each row execute function public.notify_check_change();
drop trigger if exists notify_check_change on public.identity_checks;
create trigger notify_check_change after insert or update of status on public.identity_checks
  for each row execute function public.notify_check_change();

-- ---------------------------------------------------------------- extra bags
create or replace function public.notify_extra_bag_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_trav uuid := public.traveller_user(new.traveller_id);
  v_s_link text := '/sender/requests/' || new.request_id;
  v_t_link text := public.traveller_request_link(new.request_id, new.traveller_id);
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  case new.status
  when 'proposed' then
    perform public.notify_admins('extra_bag', 'Extra bag to review', 'A traveller proposed an extra bag.', '/admin/extra-bags', new.request_id);
  when 'approved' then
    perform public.notify(new.sender_id, 'extra_bag', 'Extra bag offered',
      'Your traveller can take an extra bag for ' || coalesce(new.total::text, '') || '. Open the request to accept and pay.', v_s_link, new.request_id);
    perform public.notify(v_trav, 'extra_bag', 'Extra bag approved', 'Eban approved your extra bag. Waiting for the sender.', v_t_link, new.request_id);
  when 'payment_pending' then
    perform public.notify_admins('extra_bag', 'Extra bag payment to confirm', 'A sender says they paid for an extra bag.', '/admin/extra-bags', new.request_id);
  when 'held' then
    perform public.notify(v_trav, 'extra_bag', 'Extra bag paid', 'The sender paid for the extra bag. Eban is holding it.', v_t_link, new.request_id);
    perform public.notify(new.sender_id, 'extra_bag', 'Extra bag payment confirmed', 'Eban is holding your extra bag payment.', v_s_link, new.request_id);
  when 'advance_sent' then
    perform public.notify(v_trav, 'extra_bag', 'Bag advance sent', 'Eban sent your advance to buy the extra bag.', v_t_link, new.request_id);
  when 'settled' then
    perform public.notify(v_trav, 'extra_bag', 'Extra bag settled', 'The rest of your extra bag money has been sent.', v_t_link, new.request_id);
  when 'cancelled' then
    perform public.notify(new.sender_id, 'extra_bag', 'Extra bag cancelled', 'The extra bag was cancelled.', v_s_link, new.request_id);
    perform public.notify(v_trav, 'extra_bag', 'Extra bag cancelled', 'The extra bag was cancelled.', v_t_link, new.request_id);
  else null;
  end case;
  return new;
end;
$function$;

drop trigger if exists notify_extra_bag_change on public.extra_bags;
create trigger notify_extra_bag_change after insert or update of status on public.extra_bags
  for each row execute function public.notify_extra_bag_change();

-- ---------------------------------------------------------------- messages
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  r public.delivery_requests;
  v_trav uuid;
  v_to uuid;
  v_link text;
  v_name text;
begin
  select * into r from public.delivery_requests where id = new.request_id;
  v_trav := public.traveller_user(r.matched_traveller_id);
  if new.author_id = r.sender_id then
    v_to := v_trav; v_link := public.traveller_request_link(r.id, r.matched_traveller_id);
  elsif new.author_id = v_trav then
    v_to := r.sender_id; v_link := '/sender/requests/' || r.id;
  else
    return new;
  end if;
  if v_to is null then return new; end if;

  -- One unread "new message" per conversation is enough.
  if exists (select 1 from public.notifications n
             where n.user_id = v_to and n.request_id = r.id and n.type = 'message' and not n.read_status) then
    return new;
  end if;

  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Your contact') into v_name from public.profiles where id = new.author_id;
  perform public.notify(v_to, 'message', 'New message from ' || coalesce(v_name, 'your contact'),
    left(new.body, 140), v_link, r.id);
  return new;
end;
$function$;

drop trigger if exists notify_new_message on public.messages;
create trigger notify_new_message after insert on public.messages
  for each row execute function public.notify_new_message();

-- ---------------------------------------------------------------- disputes
create or replace function public.notify_dispute_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare r public.delivery_requests; v_link text;
begin
  if new.status is not distinct from old.status or new.status not in ('resolved', 'rejected') then return new; end if;
  select * into r from public.delivery_requests where id = new.request_id;
  v_link := case when new.raised_by = r.sender_id then '/sender/requests/' || r.id
                 else public.traveller_request_link(r.id, r.matched_traveller_id) end;
  perform public.notify(new.raised_by, 'dispute_closed',
    case when new.status = 'resolved' then 'Your report was resolved' else 'Your report was closed' end,
    coalesce(nullif(trim(new.admin_note), ''),
      case new.resolution
        when 'release' then 'Eban released the payment to the traveller.'
        when 'refund' then 'Eban refunded the sender.'
        when 'back_to_delivered' then 'The delivery is back to "delivered". You can confirm it arrived or report again.'
        else 'Open the request to see the outcome.' end), v_link, r.id);
  return new;
end;
$function$;

drop trigger if exists notify_dispute_change on public.disputes;
create trigger notify_dispute_change after update of status on public.disputes
  for each row execute function public.notify_dispute_change();

revoke all on function public.notify_request_change() from public, anon, authenticated;
revoke all on function public.notify_payment_change() from public, anon, authenticated;
revoke all on function public.notify_payout_change() from public, anon, authenticated;
revoke all on function public.notify_check_change() from public, anon, authenticated;
revoke all on function public.notify_extra_bag_change() from public, anon, authenticated;
revoke all on function public.notify_new_message() from public, anon, authenticated;
revoke all on function public.notify_dispute_change() from public, anon, authenticated;

-- ---------------------------------------------------------------- reminders (hourly)
create or replace function public.send_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare r public.delivery_requests; n integer := 0;
begin
  -- Unpaid bookings are released 48 hours after booking. Halfway there, remind once.
  for r in
    select dr.* from public.delivery_requests dr
    where dr.status = 'accepted_by_traveller'
      and dr.matched_at < now() - interval '24 hours'
      and not exists (select 1 from public.payments p where p.request_id = dr.id)
      and not exists (select 1 from public.notifications n where n.request_id = dr.id and n.type = 'reminder_pay')
  loop
    perform public.notify(r.sender_id, 'reminder_pay', 'Reminder: pay to keep your spot',
      'Your traveller is waiting. Pay for the ' || public.request_label(r) || ' within 24 hours or the booking will be released.',
      '/sender/requests/' || r.id, r.id);
    n := n + 1;
  end loop;

  -- Matched but the traveller has not answered after 24 hours.
  for r in
    select dr.* from public.delivery_requests dr
    where dr.status = 'matched'
      and dr.matched_at < now() - interval '24 hours'
      and not exists (select 1 from public.notifications n where n.request_id = dr.id and n.type = 'reminder_accept')
  loop
    perform public.notify(public.traveller_user(r.matched_traveller_id), 'reminder_accept', 'Reminder: a sender is waiting',
      'Please accept or decline the ' || public.request_label(r) || '.',
      public.traveller_request_link(r.id, r.matched_traveller_id), r.id);
    n := n + 1;
  end loop;

  -- Delivered 48 hours ago and not confirmed: tell the sender payment releases in 24 hours.
  for r in
    select dr.* from public.delivery_requests dr
    where dr.status = 'delivered'
      and dr.delivered_at < now() - interval '48 hours'
      and not exists (select 1 from public.notifications n where n.request_id = dr.id and n.type = 'reminder_release')
  loop
    perform public.notify(r.sender_id, 'reminder_release', 'Payment releases in 24 hours',
      'If anything is wrong with the ' || public.request_label(r) || ', report it now. Otherwise the traveller is paid automatically.',
      '/sender/requests/' || r.id, r.id);
    n := n + 1;
  end loop;

  -- Keep the table small: read notifications older than 90 days go.
  delete from public.notifications where read_status and created_at < now() - interval '90 days';
  return n;
end;
$function$;

revoke all on function public.send_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'send-reminders';
    perform cron.schedule('send-reminders', '25 * * * *', 'select public.send_reminders()');
  end if;
end $$;

-- ---------------------------------------------------------------- live updates
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
