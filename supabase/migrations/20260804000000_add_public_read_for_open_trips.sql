-- Senders currently have no way to see that a traveler is actually available on
-- their route before submitting a request -- this is a real trust/conversion gap.
-- Expose a safe, minimal public read of OPEN trips (route, dates, capacity only --
-- no traveller identity, which stays behind the existing traveller_profiles policies)
-- so the marketing site and booking flow can show real live availability.

create policy trips_public_select_open
  on public.trips
  for select
  to anon, authenticated
  using (status = 'open' and departure_date >= current_date);
