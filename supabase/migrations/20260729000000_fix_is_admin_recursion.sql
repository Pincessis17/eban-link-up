-- is_admin() was defined without SECURITY DEFINER, so its internal query against
-- public.profiles was itself subject to RLS. The profiles_select/update policies
-- call is_admin() as part of their qual, creating a self-referential loop:
-- evaluating the policy calls is_admin(), which queries profiles, which
-- re-evaluates the same policy, which calls is_admin() again, and so on until
-- Postgres hits its stack depth limit and the whole query errors out (500).
-- Any RLS policy that calls is_admin() -- delivery_requests, matches,
-- handoff_preferences, profiles itself -- was at risk of hitting this.
--
-- Fix: mark it SECURITY DEFINER so its internal query runs as the function
-- owner and bypasses RLS, breaking the recursive cycle.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  );
$$;
