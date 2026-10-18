-- Where Eban sends a traveler's earnings. Only the traveler and admins can read these
-- (traveller_profiles RLS already limits rows to the owner and admins).

alter table public.traveller_profiles
  add column if not exists payout_method text check (payout_method in ('bank', 'mobile_money')),
  add column if not exists payout_account_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_provider text;
