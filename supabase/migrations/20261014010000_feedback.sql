-- Community feedback: signed-in users leave a rating + comment, admin approves,
-- approved entries appear on the public landing page (first name + initial only).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 600),
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now(),
  constraint feedback_one_per_user unique (user_id)
);

alter table public.feedback enable row level security;
grant select, insert, update, delete on public.feedback to authenticated;

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists feedback_update on public.feedback;
create policy feedback_update on public.feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Public read of approved feedback only, with a privacy-safe display name.
create or replace function public.public_feedback()
returns table (id uuid, display_name text, role text, rating smallint, comment text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         coalesce(
           nullif(trim(split_part(coalesce(p.full_name, ''), ' ', 1)), '')
             || case when position(' ' in trim(coalesce(p.full_name, ''))) > 0
                     then ' ' || upper(left(trim(substring(trim(p.full_name) from position(' ' in trim(p.full_name)) + 1)), 1)) || '.'
                     else '' end,
           'Eban user'),
         p.role, f.rating, f.comment, f.created_at
  from public.feedback f
  join public.profiles p on p.id = f.user_id
  where f.status = 'approved'
  order by f.created_at desc
  limit 100;
$$;

revoke all on function public.public_feedback() from public;
grant execute on function public.public_feedback() to anon, authenticated;
