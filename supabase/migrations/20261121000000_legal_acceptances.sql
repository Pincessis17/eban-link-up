-- Terms of Service and Privacy Policy: record who agreed to which version, and when; store each person's country.
-- * At sign-up the app sends the versions agreed to (and the country) with the new account; a trigger records them.
-- * Existing accounts are asked once in the app and agree through accept_legal().
-- Nobody can edit or delete these records (they are proof of agreement). Safe to run more than once.

alter table public.profiles add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version text not null check (char_length(version) <= 20),
  accepted_at timestamptz not null default now(),
  how text not null default 'app' check (how in ('signup', 'app')),
  unique (user_id, document, version)
);
create index if not exists legal_acceptances_user_idx on public.legal_acceptances (user_id);

alter table public.legal_acceptances enable row level security;
drop policy if exists legal_acceptances_read on public.legal_acceptances;
create policy legal_acceptances_read on public.legal_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

-- Agree from inside the app (existing accounts, or after the texts are updated).
create or replace function public.accept_legal(p_terms_version text, p_privacy_version text, p_country text default null)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if coalesce(p_terms_version, '') = '' or coalesce(p_privacy_version, '') = '' then raise exception 'Missing version'; end if;
  insert into public.legal_acceptances (user_id, document, version, how)
  values (auth.uid(), 'terms', left(p_terms_version, 20), 'app'), (auth.uid(), 'privacy', left(p_privacy_version, 20), 'app')
  on conflict (user_id, document, version) do nothing;
  if p_country ~ '^[A-Z]{2}$' then
    update public.profiles set country = p_country where id = auth.uid() and country is null;
  end if;
end;
$function$;
revoke all on function public.accept_legal(text, text, text) from public, anon;
grant execute on function public.accept_legal(text, text, text) to authenticated;

-- Agree at sign-up: the versions and country arrive with the new account. Runs after on_auth_user_created
-- (triggers run in name order), so the profile already exists.
create or replace function public.record_signup_agreement()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_terms text := left(new.raw_user_meta_data ->> 'terms_version', 20);
  v_privacy text := left(new.raw_user_meta_data ->> 'privacy_version', 20);
  v_country text := upper(new.raw_user_meta_data ->> 'country');
begin
  if coalesce(v_terms, '') <> '' then
    insert into public.legal_acceptances (user_id, document, version, how, accepted_at)
    values (new.id, 'terms', v_terms, 'signup', new.created_at) on conflict do nothing;
  end if;
  if coalesce(v_privacy, '') <> '' then
    insert into public.legal_acceptances (user_id, document, version, how, accepted_at)
    values (new.id, 'privacy', v_privacy, 'signup', new.created_at) on conflict do nothing;
  end if;
  if v_country ~ '^[A-Z]{2}$' then
    update public.profiles set country = v_country where id = new.id;
  end if;
  return new;
exception when others then
  -- Never block a sign-up over this; the app asks again on first sign-in.
  return new;
end;
$function$;
revoke all on function public.record_signup_agreement() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_terms on auth.users;
create trigger on_auth_user_created_terms after insert on auth.users
  for each row execute function public.record_signup_agreement();
