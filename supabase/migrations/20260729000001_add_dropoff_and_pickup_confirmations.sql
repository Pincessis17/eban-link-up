-- Two custody-transfer points were missing explicit confirmation:
-- 1. Sender -> EBAN at origin drop-off: EBAN staff already mark this (dropped_off_at),
--    but there was no way for the sender to acknowledge it on their end.
-- 2. Traveller -> EBAN at destination: the traveller could unilaterally mark a
--    request "delivered" with no EBAN confirmation at all, which undermines
--    EBAN being the sole intermediary. This now requires EBAN staff to confirm
--    receipt from the traveller before the sender is told to collect it.

alter table public.delivery_requests
  add column if not exists sender_dropoff_confirmed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists pickup_confirmed_at timestamptz;
