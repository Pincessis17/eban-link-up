-- Broaden delivery_requests status enum to include physical handoff milestones
alter table public.delivery_requests drop constraint if exists delivery_requests_status_check;
alter table public.delivery_requests add constraint delivery_requests_status_check
  check (status = any (array[
    'draft','submitted','matched','accepted_by_traveller','paid',
    'dropped_off','handed_to_traveller','in_transit','delivered',
    'completed','disputed','cancelled'
  ]::text[]));

-- Track when the sender dropped off at the EBAN hub, when the traveler received it, and proof of receipt
alter table public.delivery_requests add column if not exists dropped_off_at timestamptz;
alter table public.delivery_requests add column if not exists handed_to_traveller_at timestamptz;
alter table public.delivery_requests add column if not exists handoff_signature_url text;

-- Traveler's choice of handoff timing/location once they've accepted a match:
-- standard airport handoff, or an earlier custom time/place
create table if not exists public.handoff_preferences (
  id uuid primary key default extensions.uuid_generate_v4(),
  request_id uuid not null unique references public.delivery_requests(id) on delete cascade,
  type text not null check (type in ('airport','custom')),
  scheduled_time timestamptz,
  location text,
  created_at timestamptz not null default now()
);

alter table public.handoff_preferences enable row level security;

create policy handoff_preferences_select on public.handoff_preferences
  for select using (
    is_admin() or exists (
      select 1 from delivery_requests dr
      join traveller_profiles tp on tp.id = dr.matched_traveller_id
      where dr.id = handoff_preferences.request_id and tp.user_id = auth.uid()
    )
  );

create policy handoff_preferences_write on public.handoff_preferences
  for all using (
    is_admin() or exists (
      select 1 from delivery_requests dr
      join traveller_profiles tp on tp.id = dr.matched_traveller_id
      where dr.id = handoff_preferences.request_id and tp.user_id = auth.uid()
    )
  ) with check (
    is_admin() or exists (
      select 1 from delivery_requests dr
      join traveller_profiles tp on tp.id = dr.matched_traveller_id
      where dr.id = handoff_preferences.request_id and tp.user_id = auth.uid()
    )
  );

-- Signature capture reference for one-time traveler ID verification during onboarding
alter table public.verifications add column if not exists id_document_type text;
