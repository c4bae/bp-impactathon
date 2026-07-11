// =====================================================================
// API + AI CONTRACTS — request/response shapes and the AI service
// interfaces. These are the seams that make the four workstreams parallel.
// The AI interfaces have a MOCK impl (offline, deterministic) committed in
// the scaffold; Contributor 4 swaps in the real OpenRouter/ElevenLabs impl
// behind the SAME interface, so nobody is blocked on API keys.
// =====================================================================

import type {
  AccommodationTag, EventCategory, RankedEvent, Signup, Event,
  QuickPick, Route, BlockerReason, AttendedState, OrgScorecard,
} from './models';

// ---- REST request/response DTOs -------------------------------------

export interface RankedFeedQuery {
  user_id: string;
  /** free-text natural-language query; routed through AiService.search */
  q?: string;
  categories?: EventCategory[];
  accommodation_tags?: AccommodationTag[];
  max_cost?: number;
}

export interface CreateSignupBody {
  user_id: string;
  event_id: string;
  needs_flagged?: AccommodationTag[];
}

export interface UpdateSignupBody {
  attended: AttendedState;
  blocker?: BlockerReason | null;
}

export interface CreateEventBody {
  org_id: string;
  title: string;
  description: string;
  category: EventCategory[];
  date_start: string;
  date_end?: string | null;
  cost: 'free' | 'paid';
  cost_amount?: number | null;
  age_group?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  accommodation_tags?: AccommodationTag[];
  created_via?: 'form' | 'voice';
  /** if omitted, the server calls AiService.simplify() to populate it */
  plain_language_description?: string | null;
}

/** Partial event update (calendar edit flow). org/created_via are immutable. */
export type UpdateEventBody = Partial<Omit<CreateEventBody, 'org_id' | 'created_via'>>;

export interface ResolveGapBody {
  /** the tag the org is claiming to have fixed; flips the badge to confirmed */
  resolved_tag?: AccommodationTag;
}

export interface QuickPickTodayResponse {
  categories: EventCategory[];
}

export interface SubmitQuickPickBody {
  user_id: string;
  event_category: EventCategory;
  response: boolean;
}

// ---- AI service interface (the swappable seam) ----------------------

/** Structured event fields extracted from a raw voice/staff transcript. */
export interface ExtractedEvent {
  title: string;
  description: string;
  date_start: string | null; // ISO if the model could resolve it
  category: EventCategory[];
  accommodation_tags: AccommodationTag[];
  location_address: string | null;
  cost: 'free' | 'paid';
  cost_amount: number | null;
}

export interface AiService {
  /** Rewrite a description at ~grade-5 plain language. Used at event-create. */
  simplify(description: string): Promise<string>;

  /** Voice/staff transcript -> structured event fields (single LLM call). */
  extractEvent(transcript: string): Promise<ExtractedEvent>;

  /**
   * Natural-language search. Returns event ids ranked by relevance to `query`,
   * given a candidate set. Keep it cheap: the server passes a shortlist.
   */
  search(query: string, candidates: Event[]): Promise<string[]>;

  /** Text -> spoken audio (ElevenLabs TTS). Returns audio/mpeg bytes. */
  tts(text: string): Promise<Buffer>;

  /** Spoken audio -> transcript (ElevenLabs Scribe STT). */
  stt(audio: Buffer, mimeType: string): Promise<string>;
}

// ---- Endpoint map (documentation; the server implements these) ------
// GET    /api/events                 ?user_id=&q=&categories=&accommodation_tags=&max_cost=  -> RankedEvent[]
// GET    /api/events/:id                                                                     -> Event & { org_name, route? }
// POST   /api/events                 CreateEventBody                                          -> Event
// PATCH  /api/events/:id             UpdateEventBody   (re-simplifies if description changes) -> Event
// DELETE /api/events/:id                                                                      -> 204
// GET    /api/signups                ?user_id=                                                -> Signup[]
// POST   /api/signups                CreateSignupBody                                         -> Signup
// PATCH  /api/signups/:id            UpdateSignupBody   (recomputes badge synchronously)      -> Signup
// GET    /api/quick-picks/today      ?user_id=                                                -> QuickPickTodayResponse
// POST   /api/quick-picks            SubmitQuickPickBody                                      -> QuickPick
// GET    /api/routes/:eventId                                                                 -> Route | 404
// GET    /api/orgs/:id/scorecard                                                              -> OrgScorecard
// POST   /api/orgs/:id/events/:eventId/resolve-gap   ResolveGapBody                           -> Event
// POST   /api/ai/simplify            { description }                                          -> { plain_language }
// POST   /api/ai/extract             { transcript }                                           -> ExtractedEvent
// POST   /api/ai/tts                 { text }                                                 -> audio/mpeg
// POST   /api/ai/stt                 multipart file 'audio'                                   -> { transcript }
export type _EndpointDocs = never;
