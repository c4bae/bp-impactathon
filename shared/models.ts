// =====================================================================
// CANONICAL DATA MODEL — the contract every contributor builds against.
// Imported by BOTH server (src/**) and web (src/**). Keep in sync with
// db/schema.sql. If you change a field here, change it there too.
//
// INTEGRITY RULE: accommodation tags / needs / blockers are FUNCTIONAL
// NEEDS, never diagnoses. Do not add a "disability_type" field. Ever.
// =====================================================================

export type AccommodationTag =
  | 'wheelchair_access'
  | 'step_free'
  | 'asl_interpretation'
  | 'sensory_friendly'
  | 'quiet_space'
  | 'plain_language'
  | 'service_animal_friendly'
  | 'transportation_support'
  | 'low_cost'
  | 'mobility_support';

export type EventCategory =
  | 'arts' | 'sports' | 'education' | 'social' | 'health'
  | 'employment' | 'family' | 'food' | 'outdoors' | 'tech';

export type BadgeState = 'not_yet_verified' | 'confirmed' | 'reported_gap';
export type CreatedVia = 'form' | 'voice';
export type AttendedState = 'yes' | 'no' | 'partial' | 'not_yet_reported';
export type BlockerReason =
  | 'cost' | 'transportation' | 'accommodation_gap'
  | 'scheduling' | 'did_not_feel_welcome' | 'other';
export type CostType = 'free' | 'paid';
export type TransitMode = 'walk' | 'bus';

export interface User {
  id: string;
  name: string;
  contact_method: string | null;
  saved_lat: number | null;
  saved_lng: number | null;
  saved_postal: string | null;
  accommodation_needs: AccommodationTag[];
  created_at: string;
}

export interface Org {
  id: string;
  name: string;
  contact_email: string | null;
  verified: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  org_id: string;
  title: string;
  description: string;
  plain_language_description: string | null;
  category: EventCategory[];
  date_start: string;
  date_end: string | null;
  cost: CostType;
  cost_amount: number | null;
  age_group: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  accommodation_tags: AccommodationTag[];
  accessibility_badge_state: BadgeState;
  created_via: CreatedVia;
  created_at: string;
}

/** An Event enriched by the ranking query for the seeker feed. */
export interface RankedEvent extends Event {
  org_name: string;
  /** straight-line km from the requesting user's saved location, if known */
  distance_km: number | null;
  /** ranking score (higher = more relevant); explained by `score_reasons` */
  score: number;
  score_reasons: string[];
}

export interface Signup {
  id: string;
  user_id: string;
  event_id: string;
  needs_flagged: AccommodationTag[];
  attended: AttendedState;
  blocker: BlockerReason | null;
  created_at: string;
}

/** A swipe on a specific event — category/tag affinity is derived from
 * these, not recorded directly. See server/src/routes/events.ts. */
export interface QuickPick {
  id: string;
  user_id: string;
  event_id: string;
  response: boolean;
  created_at: string;
}

export interface RouteStep {
  text: string;
  lat?: number;
  lng?: number;
}

/** Journey accessibility consideration — about the ENVIRONMENT, never a person. */
export type CautionSeverity = 'caution' | 'barrier'; // caution = yellow, barrier = red
export interface RouteCaution {
  text: string;
  severity: CautionSeverity;
}

export interface Route {
  id: string;
  event_id: string;
  transit_mode: TransitMode;
  step_free: boolean;
  nearest_accessible_stop: string | null;
  estimated_time_minutes: number | null;
  steps: RouteStep[];
  cautions: RouteCaution[];
  created_at: string;
}

/** Aggregated, suppression-applied barrier counts for one event. */
export interface BarrierReport {
  event_id: string;
  blocker_reason: BlockerReason;
  count: number;
}

export interface OrgScorecard {
  org_id: string;
  org_name: string;
  event_count: number;
  total_signups: number;
  total_attended: number;
  attendance_rate: number; // 0..1
  repeat_attendee_rate: number; // 0..1
  /** ranked blockers across the org's events, suppression already applied */
  ranked_blockers: { blocker_reason: BlockerReason; count: number }[];
  events: {
    event_id: string;
    title: string;
    signups: number;
    attended: number;
    badge_state: BadgeState;
    /** blockers for THIS event (suppression-applied below threshold) */
    blockers: { blocker_reason: BlockerReason; count: number }[];
    /** accommodation needs mentioned by blocker-reporting signups, aggregated
     * and counted only — never tied to a name. Gives the org concrete detail
     * ("2 mentioned wheelchair access") without exposing who. */
    related_needs: { tag: AccommodationTag; count: number }[];
  }[];
}

// ---- Human-readable labels (share these; do not re-invent per screen) ----
export const ACCOMMODATION_LABELS: Record<AccommodationTag, string> = {
  wheelchair_access: 'Wheelchair access',
  step_free: 'Step-free',
  asl_interpretation: 'ASL interpretation',
  sensory_friendly: 'Sensory-friendly',
  quiet_space: 'Quiet space',
  plain_language: 'Plain language',
  service_animal_friendly: 'Service animals welcome',
  transportation_support: 'Transportation support',
  low_cost: 'Low cost',
  mobility_support: 'Mobility support',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  arts: 'Arts', sports: 'Sports', education: 'Education', social: 'Social',
  health: 'Health', employment: 'Employment', family: 'Family', food: 'Food',
  outdoors: 'Outdoors', tech: 'Tech',
};

export const BLOCKER_LABELS: Record<BlockerReason, string> = {
  cost: 'Cost',
  transportation: 'Transportation',
  accommodation_gap: 'Accommodation gap',
  scheduling: 'Scheduling',
  did_not_feel_welcome: 'Did not feel welcome',
  other: 'Other',
};

export const BADGE_LABELS: Record<BadgeState, string> = {
  not_yet_verified: 'Not yet verified',
  confirmed: 'Accessibility confirmed',
  reported_gap: 'Barrier reported',
};

/** Minimum count before a barrier is shown in ANY UI. Set to 1 so a single
 * report surfaces immediately — the demo prioritizes showing the report ->
 * org-sees-it -> resolve loop end to end over aggregation/anonymity. */
export const BARRIER_SUPPRESSION_THRESHOLD = 1;
