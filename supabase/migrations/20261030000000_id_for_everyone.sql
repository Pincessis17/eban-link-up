-- ID check for every user (senders and travellers), one per person.
-- Run after 20261025030000_face_video_kyc.sql.
-- Files go in the existing private bucket verification-documents (owner folder, admin can read).

create table if not exists public.id_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_url text not null,
  id_document_type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists id_documents_user_idx on public.id_documents (user_id, created_at desc);

alter table public.id_documents enable row level security;
revoke all on public.id_documents from anon, authenticated;
grant select on public.id_documents to authenticated;
drop policy if exists id_documents_select on public.id_documents;
create policy id_documents_select on public.id_documents for select
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.submit_id_document(p_path text, p_type text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Invalid document'; end if;
  if exists (select 1 from public.id_documents where user_id = auth.uid() and status = 'pending') then
    raise exception 'You already have an ID waiting for review';
  end if;
  insert into public.id_documents (user_id, document_url, id_document_type)
  values (auth.uid(), p_path, left(p_type, 40))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_review_id_document(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can review IDs'; end if;
  update public.id_documents
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewer_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and status = 'pending'
   returning user_id into v_user;
  if not found then raise exception 'This ID was already reviewed'; end if;
  -- keep the traveller gate in step
  update public.traveller_profiles
     set verification_status = case when p_approve then 'approved' else 'rejected' end
   where user_id = v_user;
end;
$$;

-- A traveller profile created later (after switching mode) inherits an approved ID.
create or replace function public.inherit_id_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.id_documents where user_id = new.user_id and status = 'approved') then
    update public.traveller_profiles set verification_status = 'approved' where id = new.id;
  end if;
  return null;
end;
$$;
drop trigger if exists inherit_id_approval on public.traveller_profiles;
create trigger inherit_id_approval after insert on public.traveller_profiles
  for each row execute function public.inherit_id_approval();

revoke all on function public.submit_id_document(text, text) from public, anon;
revoke all on function public.admin_review_id_document(uuid, boolean, text) from public, anon;
grant execute on function public.submit_id_document(text, text) to authenticated;
grant execute on function public.admin_review_id_document(uuid, boolean, text) to authenticated;

-- Travellers already approved keep their status: copy those IDs across once.
insert into public.id_documents (user_id, document_url, id_document_type, status, reviewed_at, created_at)
select tp.user_id, v.document_url, coalesce(v.id_document_type, 'ID'), 'approved', now(), v.created_at
from public.verifications v
join public.traveller_profiles tp on tp.id = v.traveller_id
where v.status = 'approved'
  and not exists (select 1 from public.id_documents d where d.user_id = tp.user_id);
