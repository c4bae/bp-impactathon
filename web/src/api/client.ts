// =====================================================================
// Typed API client — the ONLY place the frontend talks to the server.
// Every contributor imports from here. If you need a new endpoint, add a
// typed method here rather than calling fetch() inside a component.
// =====================================================================
import type {
  RankedEvent, Event, Signup, QuickPick, Route, OrgScorecard,
  EventCategory, AccommodationTag, AttendedState, BlockerReason,
} from '../../../shared/models';
import type {
  CreateEventBody, ExtractedEvent, ResolveGapBody,
} from '../../../shared/contracts';

const BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface FeedParams {
  user_id: string;
  q?: string;
  categories?: EventCategory[];
  accommodation_tags?: AccommodationTag[];
  max_cost?: number;
}

export type EventDetail = Event & { org_name: string; route: Route | null };

export const api = {
  // ---- events / discovery (Contributor 1 + 2) ----
  feed(p: FeedParams): Promise<RankedEvent[]> {
    const qs = new URLSearchParams({ user_id: p.user_id });
    if (p.q) qs.set('q', p.q);
    if (p.categories?.length) qs.set('categories', p.categories.join(','));
    if (p.accommodation_tags?.length) qs.set('accommodation_tags', p.accommodation_tags.join(','));
    if (p.max_cost != null) qs.set('max_cost', String(p.max_cost));
    return req(`/events?${qs}`);
  },
  event(id: string): Promise<EventDetail> {
    return req(`/events/${id}`);
  },
  createEvent(body: CreateEventBody): Promise<Event> {
    return req(`/events`, { method: 'POST', body: JSON.stringify(body) });
  },

  // ---- signups / accountability (Contributor 3) ----
  mySignups(userId: string): Promise<Signup[]> {
    return req(`/signups?user_id=${userId}`);
  },
  signup(userId: string, eventId: string, needs_flagged?: AccommodationTag[]): Promise<Signup> {
    return req(`/signups`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, event_id: eventId, needs_flagged }),
    });
  },
  reportAttendance(
    signupId: string, attended: AttendedState, blocker?: BlockerReason | null,
  ): Promise<Signup & { event_badge_state: string }> {
    return req(`/signups/${signupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ attended, blocker }),
    });
  },

  // ---- quick picks (Contributor 2) ----
  quickPicksToday(userId: string): Promise<{ categories: EventCategory[] }> {
    return req(`/quick-picks/today?user_id=${userId}`);
  },
  submitQuickPick(userId: string, category: EventCategory, response: boolean): Promise<QuickPick> {
    return req(`/quick-picks`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, event_category: category, response }),
    });
  },

  // ---- routes (Contributor 2) ----
  route(eventId: string): Promise<Route> {
    return req(`/routes/${eventId}`);
  },

  // ---- org scorecard + admin (Contributor 4) ----
  scorecard(orgId: string): Promise<OrgScorecard> {
    return req(`/orgs/${orgId}/scorecard`);
  },
  resolveGap(orgId: string, eventId: string, body: ResolveGapBody = {}): Promise<Event> {
    return req(`/orgs/${orgId}/events/${eventId}/resolve-gap`, {
      method: 'POST', body: JSON.stringify(body),
    });
  },

  // ---- AI (Contributor 4 wires real; mock works out of the box) ----
  aiStatus(): Promise<{ mode: 'mock' | 'live' }> {
    return req(`/ai/status`);
  },
  simplify(description: string): Promise<{ plain_language: string }> {
    return req(`/ai/simplify`, { method: 'POST', body: JSON.stringify({ description }) });
  },
  extractEvent(transcript: string): Promise<ExtractedEvent> {
    return req(`/ai/extract`, { method: 'POST', body: JSON.stringify({ transcript }) });
  },
  /** Returns audio bytes, or null if the server can't do TTS (use browser fallback). */
  async tts(text: string): Promise<Blob | null> {
    const res = await fetch(`${BASE}/ai/tts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return res.blob();
  },
  async stt(audio: Blob): Promise<string> {
    const form = new FormData();
    form.append('audio', audio, 'recording.webm');
    const res = await fetch(`${BASE}/ai/stt`, { method: 'POST', body: form });
    if (!res.ok) throw new ApiError(res.status, 'stt_failed');
    return (await res.json()).transcript;
  },

  // ---- users (demo switcher) ----
  users(): Promise<import('../../../shared/models').User[]> {
    return req(`/users`);
  },
};
