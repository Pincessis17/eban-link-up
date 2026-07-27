-- Travelers need to see and respond to matches proposed to them.
-- Creating/deleting matches stays admin-only (manual matching for v1);
-- these policies only add SELECT and UPDATE for the traveler's own rows.

create policy matches_traveller_select on public.matches
  for select using (
    exists (
      select 1 from traveller_profiles tp
      where tp.id = matches.traveller_id and tp.user_id = auth.uid()
    )
  );

create policy matches_traveller_update on public.matches
  for update using (
    exists (
      select 1 from traveller_profiles tp
      where tp.id = matches.traveller_id and tp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from traveller_profiles tp
      where tp.id = matches.traveller_id and tp.user_id = auth.uid()
    )
  );
