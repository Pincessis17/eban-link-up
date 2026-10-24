-- Face video KYC. Senders and travellers record a short video of their face, Eban reviews it by hand.
-- Videos live in a private bucket: only the owner and admins can open them.
-- Run after 20261025020000_extra_bags.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-videos', 'kyc-videos', false, 52428800, array['video/webm', 'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = 52428800,
  allowed_mime_types = array['video/webm', 'video/mp4', 'video/quicktime'];

drop policy if exists kyc_videos_insert on storage.objects;
drop policy if exists kyc_videos_select on storage.objects;
create policy kyc_videos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy kyc_videos_select on storage.objects for select to authenticated
  using (bucket_id = 'kyc-videos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create table if not exists public.identity_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_path text not null,
  mime text,
  duration_seconds integer,
  challenge_code text,                 -- digits the person was asked to say, so the reviewer can check
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists identity_checks_user_idx on public.identity_checks (user_id, created_at desc);

alter table public.identity_checks enable row level security;
revoke all on public.identity_checks from anon, authenticated;
grant select on public.identity_checks to authenticated;
drop policy if exists identity_checks_select on public.identity_checks;
create policy identity_checks_select on public.identity_checks for select
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.submit_identity_video(p_path text, p_mime text, p_seconds integer, p_challenge text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Invalid video'; end if;
  if exists (select 1 from public.identity_checks where user_id = auth.uid() and status = 'pending') then
    raise exception 'You already have a video waiting for review';
  end if;
  insert into public.identity_checks (user_id, video_path, mime, duration_seconds, challenge_code)
  values (auth.uid(), p_path, p_mime, p_seconds, left(p_challenge, 12))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_review_identity_check(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can review identity checks'; end if;
  update public.identity_checks
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewer_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and status = 'pending';
  if not found then raise exception 'This check was already reviewed'; end if;
end;
$$;

revoke all on function public.submit_identity_video(text, text, integer, text) from public, anon;
revoke all on function public.admin_review_identity_check(uuid, boolean, text) from public, anon;
grant execute on function public.submit_identity_video(text, text, integer, text) to authenticated;
grant execute on function public.admin_review_identity_check(uuid, boolean, text) to authenticated;

-- Profiles now also say whether the person passed the face check.
drop function if exists public.get_profile(uuid);
create function public.get_profile(p_user_id uuid)
returns table (
  user_id uuid, first_name text, full_name text, is_self boolean, avg_rating numeric, rating_count integer,
  parcels_sent integer, parcels_carried integer, verified boolean, member_since timestamptz, face_verified boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_view_profile(p_user_id) then return; end if;
  return query
  select
    p_user_id,
    split_part(coalesce(pr.full_name, 'Member'), ' ', 1),
    case when auth.uid() = p_user_id or public.is_admin() then pr.full_name end,
    auth.uid() = p_user_id,
    (select round(avg(r.rating)::numeric, 2) from public.ratings r where r.to_user_id = p_user_id),
    (select count(*)::integer from public.ratings r where r.to_user_id = p_user_id),
    (select count(*)::integer from public.delivery_requests dr where dr.sender_id = p_user_id and dr.status = 'completed'),
    (select count(*)::integer from public.delivery_requests dr
       join public.traveller_profiles tp on tp.id = dr.matched_traveller_id
      where tp.user_id = p_user_id and dr.status = 'completed'),
    coalesce((select tp.verification_status = 'approved' from public.traveller_profiles tp where tp.user_id = p_user_id), false),
    (select u.created_at from auth.users u where u.id = p_user_id),
    exists (select 1 from public.identity_checks ic where ic.user_id = p_user_id and ic.status = 'approved')
  from public.profiles pr where pr.id = p_user_id;
end;
$$;
revoke all on function public.get_profile(uuid) from public, anon;
grant execute on function public.get_profile(uuid) to authenticated;
