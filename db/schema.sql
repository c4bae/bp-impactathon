-- =====================================================================
-- KW Hab Community Discovery Platform — schema
-- =====================================================================
-- INTEGRITY CONSTRAINT (call this out to judges):
--   accommodation_needs and blocker_reason are FUNCTIONAL-NEED enums,
--   NEVER diagnosis fields. No table stores a disability category against
--   a named user. This is the single most important design choice here.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ---- Enums -----------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE accommodation_tag AS ENUM (
    'wheelchair_access', 'step_free', 'asl_interpretation', 'sensory_friendly',
    'quiet_space', 'plain_language', 'service_animal_friendly',
    'transportation_support', 'low_cost', 'mobility_support'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'arts', 'sports', 'education', 'social', 'health',
    'employment', 'family', 'food', 'outdoors', 'tech'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE badge_state AS ENUM ('not_yet_verified', 'confirmed', 'reported_gap');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE created_via AS ENUM ('form', 'voice');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE attended_state AS ENUM ('yes', 'no', 'partial', 'not_yet_reported');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE blocker_reason AS ENUM (
    'cost', 'transportation', 'accommodation_gap',
    'scheduling', 'did_not_feel_welcome', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cost_type AS ENUM ('free', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transit_mode AS ENUM ('walk', 'bus');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---- Tables ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  contact_method      TEXT,
  saved_lat           DOUBLE PRECISION,
  saved_lng           DOUBLE PRECISION,
  saved_postal        TEXT,
  -- functional-need enums ONLY. optional. never a diagnosis.
  accommodation_needs accommodation_tag[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orgs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  contact_email TEXT,
  verified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title                      TEXT NOT NULL,
  description                TEXT NOT NULL,
  plain_language_description TEXT,                 -- LLM-generated (OpenRouter)
  category                   event_category[] NOT NULL DEFAULT '{}',
  date_start                 TIMESTAMPTZ NOT NULL,
  date_end                   TIMESTAMPTZ,
  cost                       cost_type NOT NULL DEFAULT 'free',
  cost_amount                NUMERIC(8,2),          -- null when free
  age_group                  TEXT,
  location_lat               DOUBLE PRECISION,
  location_lng               DOUBLE PRECISION,
  location_address           TEXT,
  accommodation_tags         accommodation_tag[] NOT NULL DEFAULT '{}',
  accessibility_badge_state  badge_state NOT NULL DEFAULT 'not_yet_verified',
  created_via                created_via NOT NULL DEFAULT 'form',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- functional-need enums, optional. references the same vocabulary as
  -- users.accommodation_needs but is NEVER joined to a diagnosis.
  needs_flagged accommodation_tag[] NOT NULL DEFAULT '{}',
  attended      attended_state NOT NULL DEFAULT 'not_yet_reported',
  blocker       blocker_reason,          -- nullable; only set on follow-up
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS quick_picks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_category event_category NOT NULL,
  response       BOOLEAN NOT NULL,        -- true = interested
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  -- feeds ranking ONLY. never joined to accommodation_needs.
);

-- Hand-authored routes for the demo (route guidance screen).
CREATE TABLE IF NOT EXISTS routes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id               UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  transit_mode           transit_mode NOT NULL,
  step_free              BOOLEAN NOT NULL DEFAULT false,
  nearest_accessible_stop TEXT,
  estimated_time_minutes INTEGER,
  -- ordered steps: [{ "text": "...", "lat": 43.4, "lng": -80.5 }]
  steps                  JSONB NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Derived / aggregated view ---------------------------------------
-- barrier_reports: NEVER a raw table users see. Counts of blocker reasons
-- per event. Suppressed in UI when count < 5 (re-identification guard).
-- The <5 suppression is ENFORCED again in the API layer — never trust the
-- client. This view is the raw aggregate; the API applies the threshold.
CREATE OR REPLACE VIEW barrier_reports AS
  SELECT
    event_id,
    blocker AS blocker_reason,
    COUNT(*)::INT AS count
  FROM signups
  WHERE blocker IS NOT NULL
  GROUP BY event_id, blocker;

-- retention_metrics: repeat attendance per user (aggregate only).
CREATE OR REPLACE VIEW retention_metrics AS
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE attended IN ('yes', 'partial'))::INT AS repeat_attendance_count,
    MAX(created_at) FILTER (WHERE attended IN ('yes', 'partial')) AS last_attended_at
  FROM signups
  GROUP BY user_id;

-- ---- Indexes ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_date_start ON events(date_start);
CREATE INDEX IF NOT EXISTS idx_events_category   ON events USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_events_acc_tags   ON events USING GIN(accommodation_tags);
CREATE INDEX IF NOT EXISTS idx_signups_event     ON signups(event_id);
CREATE INDEX IF NOT EXISTS idx_signups_user      ON signups(user_id);
CREATE INDEX IF NOT EXISTS idx_quickpicks_user   ON quick_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_event      ON routes(event_id);
