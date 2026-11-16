-- Email copies of notifications.
-- Every 5 minutes the database calls the "send-emails" Edge Function, which emails any new notifications
-- (sent through Brevo) and marks them as emailed. People can switch emails off on their profile.
-- Safe to run more than once.
--
-- BEFORE RUNNING IN THE REAL PROJECT: the project address on the line marked  <-- PROJECT URL  must be
-- https://caiwzsdsfplizsoqlham.supabase.co  (real EBAN). The test project uses its own address.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------- per-person setting
alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- ---------------------------------------------------------------- notifications created before this
-- feature existed are never emailed (no surprise flood of old news).
update public.notifications set email_sent_at = coalesce(email_sent_at, now()) where email_sent_at is null;

-- ---------------------------------------------------------------- the batch the Edge Function sends
-- Claims up to p_limit unsent notifications in one go so two runs can never email the same one.
create or replace function public.claim_email_batch(p_limit integer default 50)
returns table (id uuid, email text, full_name text, title text, message text, link text, type text)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
  with picked as (
    select n.id from public.notifications n
    where n.email_sent_at is null
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
  where p.email_notifications and p.email is not null and p.email not like '%@blockaid-scan.invalid';
end;
$function$;

-- Old unsent ones (older than a day) are just marked so they stop being considered.
create or replace function public.skip_stale_emails()
returns void language sql security definer set search_path = public
as $$ update public.notifications set email_sent_at = now() where email_sent_at is null and created_at <= now() - interval '1 day' $$;

-- Lets the Edge Function check that a call really came from this database's timer.
create or replace function public.email_cron_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from vault.decrypted_secrets where name = 'email_cron_secret' and decrypted_secret = p_secret) $$;

revoke all on function public.claim_email_batch(integer) from public, anon, authenticated;
revoke all on function public.skip_stale_emails() from public, anon, authenticated;
revoke all on function public.email_cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer) to service_role;
grant execute on function public.skip_stale_emails() to service_role;
grant execute on function public.email_cron_secret_ok(text) to service_role;

-- A random secret, created inside the database and never shown to anyone.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'email_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'email_cron_secret', 'Eban email timer');
  end if;
end $$;

-- ---------------------------------------------------------------- the 5-minute timer
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
  if not exists (select 1 from public.notifications where email_sent_at is null) then
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

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'send-emails';
  perform cron.schedule('send-emails', '*/5 * * * *', 'select public.trigger_email_send()');
end $$;
