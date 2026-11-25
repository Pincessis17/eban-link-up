-- Phone and computer notifications (web push), like Instagram's.
-- When a notification is created, the database immediately asks the "send-push" Edge Function
-- to deliver it to every device the person has turned notifications on for.
-- Email becomes the fallback: it is only sent if the notification is still unread after 30 minutes.
-- Safe to run more than once.
--
-- BEFORE RUNNING IN THE REAL PROJECT: the two project addresses marked  <-- PROJECT URL  must be
-- https://caiwzsdsfplizsoqlham.supabase.co  (real EBAN).

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------- devices
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- People can see and remove their own devices. Saving goes through save_push_subscription().
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Saves this device for the signed-in person. If someone else used the same browser before,
-- the device now belongs to whoever turned notifications on last.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'Invalid device.'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$function$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public
as $$ delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- ---------------------------------------------------------------- send right away
alter table public.notifications add column if not exists push_sent_at timestamptz;

create or replace function public.trigger_push_send()
returns trigger language plpgsql security definer set search_path = public
as $function$
declare
  v_url text := 'https://hmipggzlooqlmdhtxdxj.supabase.co';  -- <-- PROJECT URL
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    return new;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'email_cron_secret';
  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-eban-cron', v_secret),
    body := jsonb_build_object('id', new.id),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  -- A push problem must never stop the notification itself from being saved.
  return new;
end;
$function$;
revoke all on function public.trigger_push_send() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.trigger_push_send();

-- The Edge Function reads the notification and the person's devices, and tidies up dead devices.
create or replace function public.push_payload(p_id uuid)
returns table (user_id uuid, title text, message text, link text, type text, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public
as $$
  select n.user_id, n.title, n.message, n.link, n.type, s.endpoint, s.p256dh, s.auth
  from public.notifications n join public.push_subscriptions s on s.user_id = n.user_id
  where n.id = p_id and n.push_sent_at is null and not n.read_status
$$;
create or replace function public.push_done(p_id uuid, p_dead text[], p_ok text[])
returns void language plpgsql security definer set search_path = public
as $function$
begin
  update public.notifications set push_sent_at = now() where id = p_id;
  delete from public.push_subscriptions where endpoint = any(coalesce(p_dead, '{}'));
  update public.push_subscriptions set last_success_at = now() where endpoint = any(coalesce(p_ok, '{}'));
end;
$function$;
revoke all on function public.push_payload(uuid) from public, anon, authenticated;
revoke all on function public.push_done(uuid, text[], text[]) from public, anon, authenticated;
grant execute on function public.push_payload(uuid) to service_role;
grant execute on function public.push_done(uuid, text[], text[]) to service_role;

-- ---------------------------------------------------------------- email only as a fallback
-- Email a notification only if it is still unread 30 minutes after it was created.
create or replace function public.claim_email_batch(p_limit integer default 50)
returns table (id uuid, email text, full_name text, title text, message text, link text, type text)
language plpgsql
security definer
set search_path = public
as $function$
begin
  -- Already seen in the app or on the phone: no email needed.
  update public.notifications n set email_sent_at = now() where n.email_sent_at is null and n.read_status;

  return query
  with picked as (
    select n.id from public.notifications n
    where n.email_sent_at is null
      and not n.read_status
      and n.created_at <= now() - interval '30 minutes'
      and n.created_at > now() - interval '1 day'
    order by n.created_at
    limit p_limit
    for update skip locked
  ), marked as (
    update public.notifications n set email_sent_at = now()
    from picked where n.id = picked.id
    returning n.id, n.user_id, n.title, n.message, n.link, n.type
  )
  select m.id, p.email, p.full_name, m.title, m.message, m.link, m.type
  from marked m join public.profiles p on p.id = m.user_id
  where p.email_notifications
    and p.email is not null
    and p.email !~* '@(example\.(com|org|net)|[^@]*\.invalid|[^@]*\.test|[^@]*\.example)$';
end;
$function$;

create or replace function public.trigger_email_send()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_url text := 'https://hmipggzlooqlmdhtxdxj.supabase.co';  -- <-- PROJECT URL
  v_secret text;
begin
  if not exists (
    select 1 from public.notifications
    where email_sent_at is null and (read_status or created_at <= now() - interval '30 minutes')
  ) then
    return;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'email_cron_secret';
  perform net.http_post(
    url := v_url || '/functions/v1/send-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-eban-cron', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$;
revoke all on function public.trigger_email_send() from public, anon, authenticated;
revoke all on function public.claim_email_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer) to service_role;
