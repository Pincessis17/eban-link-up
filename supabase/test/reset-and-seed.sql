-- =====================================================================
-- EBAN TEST PROJECT ONLY. Do NOT run this in your real EBAN project.
-- In Supabase, open the "Eban Test" project > SQL Editor > New query,
-- paste this whole file, and click Run.
--
-- It installs a "reset and fill with fake data" tool. After it is installed,
-- any time you want a fresh test world, run just this one line
-- (put your own test password between the quotes, 8+ characters):
--
--   select testkit.reset_and_seed('choose-a-test-password');
--
-- All six test accounts use that password. Their emails are:
--   admin@example.com       Efua Admin    (admin)
--   sender@example.com      Kwame Mensah  (sender, ID approved)
--   sender2@example.com     Priya Ramen   (sender, ID declined)
--   traveller@example.com   Ama Boateng   (traveller, fully verified)
--   traveller2@example.com  Kofi Badu     (traveller, ID and face check waiting for review)
--   new@example.com         Esi Owusu     (brand new sender, nothing done yet)
-- =====================================================================

-- Safety check: stop if this is the real project (it has real users).
do $$
begin
  if exists (select 1 from auth.users where email not like '%@example.com') then
    raise exception 'This looks like a project with real users. Run this only in Eban Test.';
  end if;
end $$;

create schema if not exists testkit;
revoke all on schema testkit from public, anon, authenticated;

create or replace function testkit.make_user(p_email text, p_name text, p_role text, p_password text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', p_name, 'role', case when p_role = 'Admin' then 'Sender' else p_role end),
          now() - interval '120 days', now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  if p_role = 'Admin' then update public.profiles set role = 'Admin' where id = v_id; end if;
  update public.profiles set phone = '+230 5' || lpad((floor(random()*9999999))::int::text, 7, '0') where id = v_id;
  return v_id;
end;
$$;

create or replace function testkit.reset_and_seed(p_password text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  u_admin uuid; u_kwame uuid; u_priya uuid; u_ama uuid; u_kofi uuid; u_esi uuid;
  t_ama uuid; t_kofi uuid;
  trip_lon uuid; trip_acc uuid; trip_jfk uuid;
  r uuid; d date := current_date;
  fee numeric;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'Give a test password of 8+ characters'; end if;
  if exists (select 1 from auth.users where email not like '%@example.com') then
    raise exception 'This project has real users. The test reset only runs in Eban Test.';
  end if;

  -- 1. Wipe the old test data (routes and fee settings stay)
  delete from public.delivery_requests;
  delete from public.trips;
  delete from public.feedback;
  delete from public.notifications;
  delete from public.id_documents;
  delete from public.identity_checks;
  delete from auth.users where email like '%@example.com';

  -- 2. People
  u_admin := testkit.make_user('admin@example.com',      'Efua Admin',   'Admin',     p_password);
  u_kwame := testkit.make_user('sender@example.com',     'Kwame Mensah', 'Sender',    p_password);
  u_priya := testkit.make_user('sender2@example.com',    'Priya Ramen',  'Sender',    p_password);
  u_ama   := testkit.make_user('traveller@example.com',  'Ama Boateng',  'Traveller', p_password);
  u_kofi  := testkit.make_user('traveller2@example.com', 'Kofi Badu',    'Traveller', p_password);
  u_esi   := testkit.make_user('new@example.com',        'Esi Owusu',    'Sender',    p_password);

  select id into t_ama  from public.traveller_profiles where user_id = u_ama;
  select id into t_kofi from public.traveller_profiles where user_id = u_kofi;
  update public.traveller_profiles set verification_status = 'approved', rating = 4.9, total_deliveries = 2,
         payout_method = 'mobile_money', payout_provider = 'MTN MoMo', payout_account_name = 'Ama Boateng', payout_account_number = '0240000000'
   where id = t_ama;

  -- 3. ID and face checks in every state
  insert into public.id_documents (user_id, document_url, id_document_type, status, reviewed_at, created_at) values
    (u_ama,   u_ama   || '/test-passport.jpg', 'Passport',    'approved', now() - interval '30 days', now() - interval '31 days'),
    (u_kwame, u_kwame || '/test-id.jpg',       'National ID', 'approved', now() - interval '20 days', now() - interval '21 days'),
    (u_kofi,  u_kofi  || '/test-passport.jpg', 'Passport',    'pending',  null,                       now() - interval '2 hours'),
    (u_priya, u_priya || '/test-licence.jpg',  'Driver''s License', 'rejected', now() - interval '3 days', now() - interval '4 days');
  update public.id_documents set reviewer_note = 'Photo is blurry, please retake' where user_id = u_priya;
  insert into public.identity_checks (user_id, video_path, mime, duration_seconds, challenge_code, status, reviewed_at, created_at) values
    (u_ama,  u_ama  || '/test-face.webm', 'video/webm', 12, '4821', 'approved', now() - interval '29 days', now() - interval '30 days'),
    (u_kofi, u_kofi || '/test-face.webm', 'video/webm', 12, '7360', 'pending',  null,                       now() - interval '1 hour');

  -- 4. Trips
  insert into public.trips (traveller_id, origin_country, origin_city, destination_country, destination_city, departure_date, arrival_date, capacity_kg, available_kg, price_per_kg)
  values (t_ama, 'Ghana', 'Accra', 'United Kingdom', 'London', d + 10, d + 11, 23, 9, 12) returning id into trip_lon;
  insert into public.trips (traveller_id, origin_country, origin_city, destination_country, destination_city, departure_date, arrival_date, capacity_kg, available_kg, price_per_kg)
  values (t_ama, 'Mauritius', 'Port Louis', 'Ghana', 'Accra', d + 20, d + 21, 15, 15, 9) returning id into trip_acc;
  insert into public.trips (traveller_id, origin_country, origin_city, destination_country, destination_city, departure_date, arrival_date, capacity_kg, available_kg, price_per_kg)
  values (t_kofi, 'Ghana', 'Accra', 'United States', 'New York', d + 14, d + 15, 20, 20, 14) returning id into trip_jfk;

  -- 5. Requests, one at every stage
  -- a) Open, nobody has claimed it
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, offered_price)
  values (u_kwame, 'Mauritius', 'Port Louis', 'Ghana', 'Accra', 'Food', 'TEST: 3 jars of shito and a bag of gari, sealed', 3, 'standard', d + 18, 40, 'submitted', 30);

  -- b) Booked, traveller has not accepted yet
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price)
  values (u_kwame, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Clothing', 'TEST: Two kente dresses for a wedding', 2, 'standard', d + 10, 150, 'matched', t_ama, trip_lon, 24) returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'pending');

  -- c) Accepted, waiting for the sender to pay (with chat messages)
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price)
  values (u_kwame, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Documents', 'TEST: Signed lease documents in an A4 envelope', 1.5, 'priority', d + 10, 0, 'accepted_by_traveller', t_ama, trip_lon, 18) returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'accepted');
  insert into public.messages (request_id, author_id, body, created_at) values
    (r, u_ama,   'Hi Kwame, I land at Heathrow Terminal 2 around 4pm. Is that okay for the handover?', now() - interval '3 hours'),
    (r, u_kwame, 'Perfect, I will pay into escrow today. Thank you!', now() - interval '2 hours');

  -- d) Sender says they paid, admin must confirm
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price)
  values (u_priya, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Gifts', 'TEST: Box of chocolates and a framed photo', 2.5, 'standard', d + 10, 60, 'accepted_by_traveller', t_ama, trip_lon, 30) returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'accepted');
  fee := public.service_fee_for(30);
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_priya, 30 + fee, fee, 'pending');

  -- e) Paid and held in escrow, with an extra bag waiting for admin review
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price)
  values (u_kwame, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Food', 'TEST: Dried fish and spices, vacuum packed', 4, 'standard', d + 10, 50, 'paid', t_ama, trip_lon, 48) returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'accepted');
  fee := public.service_fee_for(48);
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_kwame, 48 + fee, fee, 'held');
  insert into public.extra_bags (request_id, traveller_id, sender_id, bag_cost, compensation, service_fee, total, advance_amount, final_amount, note)
  values (r, t_ama, u_kwame, 60, 20, 3, 83, 30, 50, 'TEST: Sender wants to add a second suitcase of food');

  -- f) In transit
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price, handed_to_traveller_at)
  values (u_kwame, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Electronics', 'TEST: A boxed phone charger and headphones', 1, 'standard', d + 10, 80, 'in_transit', t_ama, trip_lon, 12, now() - interval '1 day') returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'accepted');
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_kwame, 17, 5, 'held');

  -- g) Delivered, waiting for the sender to confirm or report it missing
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, trip_id, agreed_price, handed_to_traveller_at, delivered_at)
  values (u_kwame, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Clothing', 'TEST: School uniform for my niece', 1.5, 'standard', d - 2, 30, 'delivered', t_ama, trip_lon, 18, now() - interval '4 days', now() - interval '1 day') returning id into r;
  insert into public.matches (request_id, traveller_id, match_score, status) values (r, t_ama, 100, 'accepted');
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_kwame, 23, 5, 'held');

  -- h) Completed: payout waiting, both sides rated each other
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, agreed_price, handed_to_traveller_at, delivered_at, pickup_confirmed_at)
  values (u_kwame, 'Mauritius', 'Port Louis', 'Ghana', 'Accra', 'Gifts', 'TEST: Birthday gifts for my mother', 3, 'standard', d - 15, 70, 'completed', t_ama, 27, now() - interval '18 days', now() - interval '15 days', now() - interval '14 days') returning id into r;
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_kwame, 32, 5, 'released');
  insert into public.payouts (traveller_id, request_id, amount, status) values (t_ama, r, 27, 'pending');
  insert into public.ratings (request_id, from_user_id, to_user_id, rating, comment) values
    (r, u_kwame, u_ama, 5, 'TEST: Parcel arrived sealed and on time. Ama answered every message.'),
    (r, u_ama, u_kwame, 5, 'TEST: Clear instructions and a smooth handover at the airport.');

  -- i) Disputed: sender says the parcel never arrived
  insert into public.delivery_requests (sender_id, origin_country, origin_city, destination_country, destination_city, item_type, item_description, weight_kg, urgency_level, preferred_date, item_value, status, matched_traveller_id, agreed_price, handed_to_traveller_at, delivered_at)
  values (u_priya, 'Ghana', 'Accra', 'United Kingdom', 'London', 'Documents', 'TEST: Original birth certificate', 0.5, 'urgent', d - 5, 0, 'disputed', t_ama, 10, now() - interval '7 days', now() - interval '3 days') returning id into r;
  insert into public.payments (request_id, sender_id, amount, service_fee, status) values (r, u_priya, 15, 5, 'held');
  insert into public.disputes (request_id, raised_by, reason, kind) values
    (r, u_priya, 'Item not received after the traveler marked it delivered. Sender says: TEST - nobody came to the meeting point.', 'not_received');

  -- 6. A public review for the landing page
  insert into public.feedback (user_id, rating, comment) values (u_kwame, 5, 'TEST: Much cheaper than a courier and I could chat with the traveller the whole way.');

  return 'Test data ready: 6 people, 3 trips, 9 requests (one at every stage), 1 extra bag, 1 dispute, IDs and face checks in every state.';
end;
$$;

revoke all on all functions in schema testkit from public, anon, authenticated;
