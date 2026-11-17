-- 1. Admin audit log: every change an admin makes is recorded automatically (who, when, what changed).
--    Automatic money actions (payment auto-release, expiring unpaid bookings) are recorded as "system".
--    Nobody can edit or delete the log, admins included.
-- 2. Two-step login for admins: once an admin has set up an authenticator app, their admin powers only work
--    in a session where they entered the 6-digit code. Enforced by the database, not just the screens.
-- Safe to run more than once.

-- ================================================================ 1. audit log
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  actor_kind text not null check (actor_kind in ('admin', 'system')),
  action text not null,           -- insert / update / delete
  table_name text not null,
  row_id text,
  changes jsonb                   -- update: {"column": [before, after]};  insert/delete: the whole row
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
create index if not exists admin_audit_log_row_idx on public.admin_audit_log (table_name, row_id);

alter table public.admin_audit_log enable row level security;
drop policy if exists admin_audit_log_read on public.admin_audit_log;
create policy admin_audit_log_read on public.admin_audit_log for select to authenticated using (public.is_admin());
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_kind text;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changes jsonb;
  k text;
begin
  if auth.uid() is not null and public.is_admin() then
    v_kind := 'admin';
  elsif auth.uid() is null and current_user not in ('authenticated', 'anon')
        and tg_table_name in ('payments', 'payouts', 'delivery_requests', 'extra_bags') then
    v_kind := 'system';
  else
    return null;
  end if;

  if tg_op = 'UPDATE' then
    v_changes := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      if (v_old -> k) is distinct from (v_new -> k) then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_array(v_old -> k, v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then return null; end if;
  else
    v_changes := coalesce(v_new, v_old);
  end if;

  insert into public.admin_audit_log (actor_id, actor_email, actor_kind, action, table_name, row_id, changes)
  values (auth.uid(),
          (select email from public.profiles where id = auth.uid()),
          v_kind, lower(tg_op), tg_table_name,
          coalesce(v_new ->> 'id', v_old ->> 'id'),
          v_changes);
  return null;
end;
$function$;
revoke all on function public.audit_admin_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'delivery_requests', 'payments', 'payouts', 'disputes', 'extra_bags', 'matches', 'trips',
    'id_documents', 'identity_checks', 'verifications', 'profiles', 'sender_profiles', 'traveller_profiles',
    'platform_settings', 'pricing_breakdowns', 'routes', 'feedback', 'handoff_preferences', 'ratings',
    'request_evidence'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_admin_change on public.%I', t);
      execute format('create trigger audit_admin_change after insert or update or delete on public.%I
                      for each row execute function public.audit_admin_change()', t);
    end if;
  end loop;
end $$;

-- ================================================================ 2. two-step login for admins
-- Admin powers need: the Admin role AND (the 6-digit code entered this session, OR no authenticator set up yet).
-- The app makes every admin set one up before opening the admin pages.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  and (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
  );
$function$;

-- The app asks this to decide whether to show the set-up screen, the code screen, or the admin pages.
create or replace function public.my_admin_security()
returns table (is_admin_role boolean, has_authenticator boolean, code_entered boolean)
language sql
stable
security definer
set search_path = public
as $function$
  select
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'),
    exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'),
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$function$;
revoke all on function public.my_admin_security() from public, anon;
grant execute on function public.my_admin_security() to authenticated;
