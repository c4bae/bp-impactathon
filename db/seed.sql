-- =====================================================================
-- Seed data for demo. Deterministic UUIDs so contributors can hardcode
-- the "current user" / "current org" during development (no real auth).
--
--   DEMO_USER_ID = 11111111-1111-1111-1111-111111111111
--   DEMO_ORG_ID  = 22222222-2222-2222-2222-222222222222
--
-- Badge states are pre-populated so the feed is NOT all 'not_yet_verified'
-- for the demo. 'Games at the Hangout' (event ...0002) is THE demo event —
-- kept clean (not_yet_verified, zero reports) and tuned to rank first in
-- both the seeker feed and the org dashboard, so the live demo can walk:
-- sign up -> report a barrier (flips instantly, threshold=1) -> org sees
-- it -> resolves it -> seeker sees it confirmed.
-- Event details were sourced from the public KW Habilitation community
-- calendar on 2026-07-11.
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
   '22222222-2222-2222-2222-222222222222',
   'Make It Mondays - Zentangle with Duke',
   'Create Zentangle art with Duke at LEG Up! For information about accessing LEG Up! activities, contact legup@kwhab.ca.',
   'Make Zentangle art with Duke. Contact LEG Up! to learn how to join.',
   ARRAY['arts','social']::event_category[],
   '2026-07-13 13:00-04', '2026-07-13 15:00-04',
   'free', NULL, 'adults', 43.4513, -80.4930, 'LEG Up! Classroom, 109 Ottawa Street South, Unit D, Kitchener',
   ARRAY['plain_language','step_free']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'Games at the Hangout',
   'Drop in for board games, cards, and good conversation. Come with a friend or meet someone new. Everyone is welcome.',
   'Play board games or cards and talk with people. You can bring a friend or come on your own. Everyone is welcome.',
   -- Two categories (matches the real synced duplicate listing) so quick-pick
   -- affinity can reach its cap just as easily as any rival event — see the
   -- affinity cap in server/src/routes/events.ts.
   ARRAY['social','sports']::event_category[],
   -- THE demo event: past-dated (follow-up prompt opens for real, no
   -- simulate-day-passing trigger exists) and tuned to rank #1 for the
   -- default demo user in both views — tags match their saved needs
   -- exactly (no rival event ties this), coordinates match their saved
   -- location exactly, and it's dated further back than every other
   -- past-dated event so it also sorts first in the org dashboard's
   -- date-ascending event list.
   -- Starts clean (not_yet_verified, zero reports): the whole point is to
   -- watch ONE live report flip it, then watch the org resolve it.
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 hour 30 minutes',
   'free', NULL, 'all ages', 43.4516, -80.4925, 'The Hangout, 99 Ottawa Street South, Kitchener',
   ARRAY['plain_language','step_free']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000003',
   '22222222-2222-2222-2222-222222222222',
   'Summer Baking - Cookie Dough Bites',
   'Make cookie dough bites in the LEG Up! classroom. For information about accessing LEG Up! activities, contact legup@kwhab.ca.',
   'Make cookie dough bites with the group. Contact LEG Up! to learn how to join.',
   ARRAY['food','social']::event_category[],
   -- Past-dated so its follow-up prompt opens for real (5-reporter test).
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours',
   'paid', NULL, 'adults', 43.4513, -80.4930, 'LEG Up! Classroom, 109 Ottawa Street South, Unit D, Kitchener',
   -- Only one need matches (not two, like the demo event) — keeps this from
   -- tying Games at the Hangout on accommodation-fit score.
   ARRAY['plain_language']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-222222222222',
   'Transit Tuesdays',
   'Meet at Fairway Station for a community transit outing. See the calendar listing for the current trip details.',
   'Meet the group at Fairway Station and take transit together.',
   ARRAY['education','social']::event_category[],
   -- Past-dated so the demo user's not_yet_reported signup opens a real
   -- follow-up prompt on My Signups (no simulate-day-passing trigger exists).
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '5 hours 30 minutes',
   'free', NULL, 'all ages', 43.4244, -80.4392, 'Fairway Station, 2960 Kingsway Drive, Kitchener',
   ARRAY['transportation_support','mobility_support']::accommodation_tag[],
   'not_yet_verified', 'voice'),

  ('33333333-0000-0000-0000-000000000005',
   '22222222-2222-2222-2222-222222222222',
   'Bring Along Sing Along',
   'Join a community sing-along in Victoria Park near the outdoor gym. Free accessible parking is available at 80 Schneider Road.',
   'Sing songs with the group in Victoria Park. Free accessible parking is nearby.',
   ARRAY['arts','social','outdoors']::event_category[],
   '2026-07-15 11:00-04', '2026-07-15 12:00-04',
   'free', NULL, 'all ages', 43.4472, -80.5002, 'Victoria Park near the outdoor gym, Kitchener',
   ARRAY['wheelchair_access','step_free','low_cost']::accommodation_tag[],
   'not_yet_verified', 'form'),

  ('33333333-0000-0000-0000-000000000006',
   '22222222-2222-2222-2222-000000000004',
   'Walk With PCL',
   'Join the PCL walking group at the indoor track at Waterloo Memorial Recreation Complex.',
   'Walk indoors with the group at the Waterloo Memorial Recreation Complex.',
   ARRAY['sports','health','social']::event_category[],
   '2026-07-15 12:45-04', '2026-07-15 13:35-04',
   'free', NULL, 'all ages', 43.4658, -80.5274, 'Waterloo Memorial Recreation Complex, 101 Father David Bauer Drive, Waterloo',
   ARRAY['step_free','mobility_support','low_cost']::accommodation_tag[],
   'not_yet_verified', 'form');

-- ---- Signups ---------------------------------------------------------
-- Demo user is signed up for a couple of events (drives "my signups").
INSERT INTO signups (user_id, event_id, needs_flagged, attended, blocker) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001', ARRAY['plain_language']::accommodation_tag[], 'yes', NULL),
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000004', ARRAY['step_free']::accommodation_tag[], 'not_yet_reported', NULL);

-- 'Games at the Hangout' (event ...0002) is deliberately left clean here
-- (not_yet_verified, zero reports) — it's THE demo event; the live demo's
-- money shot is filing the one report that flips it, live.

-- A few attended=yes across events for retention/scorecard numbers.
INSERT INTO signups (user_id, event_id, needs_flagged, attended, blocker) VALUES
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000001', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000003', '33333333-0000-0000-0000-000000000004', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000004', '33333333-0000-0000-0000-000000000006', '{}', 'yes', NULL),
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000006', '{}', 'yes', NULL);

-- ---- Quick Picks -----------------------------------------------------
-- No prior swipes seeded for the demo user: Games at the Hangout (...0002)
-- needs to rank first in their feed on a clean reset, purely from matching
-- accommodation needs + proximity + being the most past-dated event —
-- seeded quick-pick affinity isn't needed and would only add variance.
-- A non-demo user has swipe history instead, so Quick Picks -> ranking
-- still has real data to demo separately (see server/src/routes/events.ts).
INSERT INTO quick_picks (user_id, event_id, response) VALUES
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000001', true),  -- Ava likes Zentangle (arts, social)
  ('11111111-1111-1111-1111-000000000002', '33333333-0000-0000-0000-000000000006', false); -- Ava passes on Walk With PCL (sports, health, social)

-- ---- Routes (hand-authored) -----------------------------------------
INSERT INTO routes (event_id, transit_mode, step_free, nearest_accessible_stop, estimated_time_minutes, steps, cautions) VALUES
  ('33333333-0000-0000-0000-000000000004', 'bus', true, 'Fairway Station', 22,
   '[
     {"text": "Board an accessible GRT service toward Fairway Station.", "lat": 43.4516, "lng": -80.4925},
     {"text": "Use the stop display or ask the operator for Fairway Station.", "lat": 43.4400, "lng": -80.4680},
     {"text": "Get off at Fairway Station using the platform ramp.", "lat": 43.4248, "lng": -80.4385},
     {"text": "Meet the group in the station at 2960 Kingsway Drive.", "lat": 43.4244, "lng": -80.4392}
   ]'::jsonb,
   '[
     {"text": "Confirm the current GRT route and accessibility notices before leaving", "severity": "caution"}
   ]'::jsonb),

  ('33333333-0000-0000-0000-000000000006', 'walk', true, 'Waterloo Memorial Recreation Complex', 12,
   '[
     {"text": "Follow the paved path toward Waterloo Memorial Recreation Complex.", "lat": 43.4640, "lng": -80.5230},
     {"text": "Continue to the main recreation-complex entrance.", "lat": 43.4652, "lng": -80.5265},
     {"text": "Meet the walking group by the indoor track.", "lat": 43.4658, "lng": -80.5274}
   ]'::jsonb,
   '[]'::jsonb),

  ('33333333-0000-0000-0000-000000000001', 'walk', true, 'Ottawa St S @ Charles St', 8,
   '[
     {"text": "Follow the sidewalk toward 109 Ottawa Street South.", "lat": 43.4506, "lng": -80.4942},
     {"text": "Enter Unit D and meet the group in the LEG Up! classroom.", "lat": 43.4513, "lng": -80.4930}
   ]'::jsonb,
   '[]'::jsonb);
