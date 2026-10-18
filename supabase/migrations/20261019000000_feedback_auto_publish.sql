-- Reviews go live immediately; no admin approval step.
-- Admins can still hide a review afterwards (status = 'hidden').
-- Run after 20261014010000_feedback.sql.

alter table public.feedback alter column status set default 'approved';

-- Anything already waiting for approval is published too.
update public.feedback set status = 'approved' where status = 'pending';

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated
  with check (user_id = auth.uid() and status = 'approved');
