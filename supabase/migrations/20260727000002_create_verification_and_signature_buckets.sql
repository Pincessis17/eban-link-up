-- Private buckets for traveler ID documents and handoff signatures.
-- Objects are stored under a path prefixed with the uploader's auth.uid(),
-- e.g. verification-documents/{user_id}/id-front.jpg

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('handoff-signatures', 'handoff-signatures', false)
on conflict (id) do nothing;

create policy verification_documents_insert on storage.objects
  for insert with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy verification_documents_select on storage.objects
  for select using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy handoff_signatures_insert on storage.objects
  for insert with check (
    bucket_id = 'handoff-signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy handoff_signatures_select on storage.objects
  for select using (
    bucket_id = 'handoff-signatures'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
