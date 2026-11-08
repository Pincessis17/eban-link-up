-- Let admins delete ID documents and face-check videos after reviewing them.
-- Deleting removes the record and the file. The person then has to do that check again.
-- Run after 20261030000000_id_for_everyone.sql.

create or replace function public.admin_delete_id_document(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid; v_path text;
begin
  if not public.is_admin() then raise exception 'Only admins can delete IDs'; end if;
  delete from public.id_documents where id = p_id returning user_id, document_url into v_user, v_path;
  if not found then raise exception 'This ID was already deleted'; end if;
  -- No approved ID left: the traveller gate goes back to waiting.
  if not exists (select 1 from public.id_documents where user_id = v_user and status = 'approved') then
    update public.traveller_profiles set verification_status = 'pending'
     where user_id = v_user and verification_status = 'approved';
  end if;
  return v_path;
end;
$$;

create or replace function public.admin_delete_identity_check(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_path text;
begin
  if not public.is_admin() then raise exception 'Only admins can delete face checks'; end if;
  delete from public.identity_checks where id = p_id returning video_path into v_path;
  if not found then raise exception 'This face check was already deleted'; end if;
  return v_path;
end;
$$;

revoke all on function public.admin_delete_id_document(uuid) from public, anon;
revoke all on function public.admin_delete_identity_check(uuid) from public, anon;
grant execute on function public.admin_delete_id_document(uuid) to authenticated;
grant execute on function public.admin_delete_identity_check(uuid) to authenticated;

-- Admins may remove the files too.
drop policy if exists verification_documents_admin_delete on storage.objects;
create policy verification_documents_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-documents' and public.is_admin());
drop policy if exists kyc_videos_admin_delete on storage.objects;
create policy kyc_videos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kyc-videos' and public.is_admin());
