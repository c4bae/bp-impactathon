-- =====================================================================
-- Seed data for demo. Deterministic UUIDs so contributors can hardcode
-- the "current user" / "current org" during development (no real auth).
--
--   DEMO_USER_ID = 11111111-1111-1111-1111-111111111111
--   DEMO_ORG_ID  = 22222222-2222-2222-2222-222222222222
--
-- Badge states are pre-populated so the feed is NOT all 'not_yet_verified'
-- for the demo, AND one event ('Community Kitchen') has >=5 seeded blocker
-- reports so the aggregation/suppression logic has real data to chew on.
-- =====================================================================

-- ---- Orgs ------------------------------------------------------------
INSERT INTO orgs (id, name, contact_email, verified) VALUES
  ('22222222-2222-2222-2222-222222222222', 'KW Habilitation', 'events@kwhab.ca', true),
  ('22222222-2222-2222-2222-000000000002', 'Waterloo Public Library', 'programs@wpl.ca', true),
  ('22222222-2222-2222-2222-000000000003', 'Grand River Arts Collective', 'hello@grarts.ca', false),
  ('22222222-2222-2222-2222-000000000004', 'KW Community Sports', 'play@kwsports.ca', true);

-- ---- Users -----------------------------------------------------------
-- One demo user + several extras used ONLY to make aggregate counts real.
INSERT INTO users (id, name, contact_method, saved_lat, saved_lng, saved_postal, accommodation_needs) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo User', 'demo@example.com', 43.4516, -80.4925, 'N2G 1H6', ARRAY['step_free','plain_language']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000002', 'Ava',   NULL, 43.4643, -80.5204, 'N2L 3G1', ARRAY['sensory_friendly']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000003', 'Ben',   NULL, 43.4200, -80.4600, 'N2C 1X8', ARRAY['low_cost']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000004', 'Cara',  NULL, 43.4700, -80.5400, 'N2L 5W6', ARRAY['transportation_support']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000005', 'Dev',   NULL, 43.4400, -80.4800, 'N2G 4M4', ARRAY['wheelchair_access']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000006', 'Elu',   NULL, 43.4550, -80.4900, 'N2H 5S6', ARRAY['quiet_space']::accommodation_tag[]),
  ('11111111-1111-1111-1111-000000000007', 'Fin',   NULL, 43.4620, -80.5100, 'N2L 3W8', '{}'),
  ('11111111-1111-1111-1111-000000000008', 'Gio',   NULL, 43.4480, -80.4750, 'N2G 2B5', '{}');

-- ---- Events ----------------------------------------------------------
-- Coordinates are around Kitchener-Waterloo, ON.
INSERT INTO events
  (id, org_id, title, description, plain_language_description, category, date_start, date_end,
   cost, cost_amount, age_group, location_lat, location_lng, location_address,
   accommodation_tags, accessibility_badge_state, created_via) VALUES

  ('33333333-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-000000000002',
   'Sensory-Friendly Morning at the Library',
   'A quieter library hour with dimmed lighting, reduced noise, and fidget tools available at the front desk. Drop in any time between 9 and 11am.',
   'A calm morning at the library. Soft lights and less noise. Come any time from 9 to 11am. Free.',
   ARRAY['social','education']::event_category[],
   '2026-07-18 09:00-04', '2026-07-18 11:00-04',
   'free', NULL, 'all ages', 43.4643, -80.5204, '35 Albert St, Waterloo',
   ARRAY['sensory_friendly','quiet_space','step_free','plain_language']::accommodation_tag[],
   'confirmed', 'form'),

  ('33333333-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'Community Kitchen: Cook & Share',
   'Cook a shared meal together and take a portion home. All ingredients provided. Kitchen is on the second floor.',
   'Cook a meal with others and take some home. Food is provided. The kitchen is upstairs.',
   ARRAY['food','social']::event_category[],
   '2026-07-19 17:30-04', '2026-07-19 19:30-04',
   'free', NULL, 'adults', 43.4516, -80.4925, '108 Sydney St S, Kitchener',
   ARRAY['plain_language']::accommodation_tag[],
   'reported_gap', 'form'),

  ('33333333-0000-0000-0000-000000000003',
   '22222222-2222-2222-2222-000000000003',
   'Open Studio: Paint Night',
   'A relaxed evening of painting. No experience needed. Materials included. Cash bar on site.',
   'Paint for fun in the evening. You do not need experience. Paint and brushes are provided. $10.',
   ARRAY['arts','social']::event_category[],
   '2026-07-20 18:00-04', '2026-07-20 20:00-04',
   'paid', 10.00, 'adults', 43.4560, -80.4880, '22 King St S, Waterloo',
   ARRAY['wheelchair_access','step_free']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-000000000004',
   'Adaptive Basketball Drop-In',
   'Wheelchair and standing players welcome. Sport wheelchairs available to borrow. Gym is step-free with accessible washrooms.',
   'Basketball for everyone. You can borrow a sport wheelchair. The gym is easy to get into. Free.',
   ARRAY['sports','health']::event_category[],
   '2026-07-21 19:00-04', '2026-07-21 20:30-04',
   'free', NULL, 'all ages', 43.4400, -80.4800, '250 Hospital Rd, Kitchener',
   ARRAY['wheelchair_access','step_free','mobility_support']::accommodation_tag[],
   'confirmed', 'voice'),

  ('33333333-0000-0000-0000-000000000005',
   '22222222-2222-2222-2222-000000000002',
   'Plain-Language Job Club',
   'Weekly session to work on resumes and practice interviews together. Support staff on hand. ASL interpreter available on request.',
   'Get help with your resume and practice interviews. Staff will help you. Free.',
   ARRAY['employment','education']::event_category[],
   '2026-07-22 13:00-04', '2026-07-22 15:00-04',
   'free', NULL, 'adults', 43.4643, -80.5204, '35 Albert St, Waterloo',
   ARRAY['plain_language','asl_interpretation','step_free']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000006',
   '22222222-2222-2222-2222-000000000004',
   'Accessible Nature Walk — Huron Natural Area',
   'A guided walk on the paved, step-free trail loop. Benches every 200m. Service animals welcome.',
   'A slow guided walk on a flat, paved path. There are benches to rest. Free.',
   ARRAY['outdoors','health']::event_category[],
   '2026-07-25 10:00-04', '2026-07-25 11:30-04',
   'free', NULL, 'all ages', 43.4050, -80.4300, '801 Trillium Dr, Kitchener',
   ARRAY['step_free','service_animal_friendly','mobility_support','transportation_support']::accommodation_tag[],
   'confirmed', 'form');

-- ---- Signups ---------------------------------------------------------
-- Demo user is signed up for a couple of events (drives "my signups").
INSERT INTO signups (user_id, event_id, needs_flagged, attended, blocker) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001', ARRAY['plain_language']::accommodation_tag[], 'yes', NULL),
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000004', ARRAY['step_free']::accommodation_tag[], 'not_yet_reported', NULL);

-- >=5 blocker reports on 'Community Kitchen' (event ...0002) -> reported_gap.
-- Mix of reasons; 'accommodation_gap' is the plurality (the 2nd-floor kitchen).
INSERT INTO signups (user_id, event_id, needs_flagged, attended, blocker) VALUES
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'accommodation_gap'),
  ('11111111-1111-1111-1111-000000000003', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'accommodation_gap'),
  ('11111111-1111-1111-1111-000000000004', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'transportation'),
  ('11111111-1111-1111-1111-000000000005', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'accommodation_gap'),
  ('11111111-1111-1111-1111-000000000006', '33333333-0000-0000-0000-000000000002', '{}', 'partial', 'accommodation_gap'),
  ('11111111-1111-1111-1111-000000000007', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'accommodation_gap'),
  ('11111111-1111-1111-1111-000000000008', '33333333-0000-0000-0000-000000000002', '{}', 'no', 'scheduling');

-- A few attended=yes across events for retention/scorecard numbers.
INSERT INTO signups (user_id, event_id, needs_flagged, attended, blocker) VALUES
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000001', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000003', '33333333-0000-0000-0000-000000000004', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000004', '33333333-0000-0000-0000-000000000006', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000006', '{}', 'yes', NULL);

-- ---- Quick Picks -----------------------------------------------------
-- Prior responses for the demo user -> weights the ranking heuristic.
INSERT INTO quick_picks (user_id, event_category, response) VALUES
  ('11111111-1111-1111-1111-111111111111', 'arts', true),
  ('11111111-1111-1111-1111-111111111111', 'social', true),
  ('11111111-1111-1111-1111-111111111111', 'sports', false),
  ('11111111-1111-1111-1111-111111111111', 'food', true);

-- ---- Routes (hand-authored) -----------------------------------------
INSERT INTO routes (event_id, transit_mode, step_free, nearest_accessible_stop, estimated_time_minutes, steps) VALUES
  ('33333333-0000-0000-0000-000000000004', 'bus', true, 'Hospital Rd @ Green Valley (accessible boarding)', 22,
   '[
     {"text": "Board Route 8 at your stop toward Fairview Mall.", "lat": 43.4516, "lng": -80.4925},
     {"text": "Ride 6 stops. The bus has a ramp and priority seating.", "lat": 43.4460, "lng": -80.4860},
     {"text": "Get off at Hospital Rd @ Green Valley. Step-free curb here.", "lat": 43.4405, "lng": -80.4810},
     {"text": "Walk 120m along the paved path to the gym entrance (no stairs).", "lat": 43.4400, "lng": -80.4800}
   ]'::jsonb),

  ('33333333-0000-0000-0000-000000000006', 'walk', true, 'Trillium Dr @ Huron (step-free)', 12,
   '[
     {"text": "Head south on Trillium Dr on the paved sidewalk.", "lat": 43.4080, "lng": -80.4320},
     {"text": "The trailhead has a step-free ramp and a rest bench.", "lat": 43.4060, "lng": -80.4305},
     {"text": "Follow the paved loop. Benches every 200m.", "lat": 43.4050, "lng": -80.4300}
   ]'::jsonb),

  ('33333333-0000-0000-0000-000000000001', 'walk', true, 'Albert St @ Bridgeport (step-free)', 8,
   '[
     {"text": "Walk north on Albert St. Curb cuts at every corner.", "lat": 43.4630, "lng": -80.5210},
     {"text": "Library main entrance is level with automatic doors.", "lat": 43.4643, "lng": -80.5204}
   ]'::jsonb);
