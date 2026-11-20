-- Delete ID photos and face videos 30 days after Eban's review decision (Privacy Policy, section 5).
-- The decision record stays (approved/declined, date, reviewer); only the file goes.
-- Every night the database calls the "purge-old-ids" Edge Function, which deletes the files through Supabase Storage
-- (files can't be deleted from SQL) and records each deletion in the audit log as "Automatic".
-- Pending (not yet reviewed) uploads are never touched. Safe to run more than once.
--
-- The project address is on the line marked  <-- PROJECT URL.

alter table public.id_documents add column if not exists file_deleted_at timestamptz;
alter table public.identity_checks add column if not exists file_deleted_at timestamptz;
alter table public.verifications add column if not exists file_deleted_at timestamptz;

-- Files whose review is older than p_days and that haven't been deleted yet.
create or replace function public.identity_files_due(p_days integer default 30, p_limit integer default 200)
returns table (kind text, row_id uuid, bucket text, path text)
language sql
stable
security definer
set search_path = public
as $function$
  (select 'id_documents', d.id, 'verification-documents', d.document_url
     from public.id_documents d
    where d.status <> 'pending' and d.file_deleted_at is null and coalesce(d.document_url, '') <> ''
      and coalesce(d.reviewed_at, d.created_at) < now() - make_interval(days => p_days)
    limit p_limit)
  union all
  (select 'identity_checks', c.id, 'kyc-videos', c.video_path
     from public.identity_checks c
    where c.status <> 'pending' and c.file_deleted_at is null and coalesce(c.video_path, '') <> ''
      and coalesce(c.reviewed_at, c.created_at) < now() - make_interval(days => p_days)
    limit p_limit)
  union all
  (select 'verifications', v.id, 'verification-documents', v.document_url
     from public.verifications v
    where v.status <> 'pending' and v.file_deleted_at is null and coalesce(v.document_url, '') <> ''
      and v.created_at < now() - make_interval(days => p_days)
    limit p_limit);
$function$;

-- Marks files as deleted and writes one audit entry per file.
create or replace function public.mark_identity_files_deleted(p_kind text, p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare n integer := 0; r record;
begin
  if p_kind not in ('id_documents', 'identity_checks', 'verifications') then raise exception 'Unknown kind'; end if;
  for r in execute format(
    'update public.%I set file_deleted_at = now() where id = any($1) and file_deleted_at is null returning id, %s as path',
    p_kind, case when p_kind = 'identity_checks' then 'video_path' else 'document_url' end) using p_ids
  loop
    insert into public.admin_audit_log (actor_kind, action, table_name, row_id, changes)
    values ('system', 'delete', p_kind, r.id::text,
            jsonb_build_object('file', r.path, 'reason', 'Deleted 30 days after review (privacy policy)'));
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function public.identity_files_due(integer, integer) from public, anon, authenticated;
revoke all on function public.mark_identity_files_deleted(text, uuid[]) from public, anon, authenticated;
grant execute on function public.identity_files_due(integer, integer) to service_role;
grant execute on function public.mark_identity_files_deleted(text, uuid[]) to service_role;

-- The nightly timer (uses the same secret as the email timer, created inside the database).
create or replace function public.trigger_identity_purge()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_url text := 'https://hmipggzlooqlmdhtxdxj.supabase.co';  -- <-- PROJECT URL
  v_secret text;
begin
  if not exists (select 1 from public.identity_files_due(30, 1)) then
    return;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'email_cron_secret';
  perform net.http_post(
    url := v_url || '/functions/v1/purge-old-ids',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-eban-cron', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$function$;
revoke all on function public.trigger_identity_purge() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-old-ids';
  perform cron.schedule('purge-old-ids', '40 22 * * *', 'select public.trigger_identity_purge()');  -- 02:40 Mauritius time
end $$;
