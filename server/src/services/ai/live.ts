import type { AiService, ExtractedEvent } from '../../../../shared/contracts';
import type { AccommodationTag, Event, EventCategory } from '../../../../shared/models';
import { ACCOMMODATION_LABELS, CATEGORY_LABELS } from '../../../../shared/models';

// =====================================================================
// LIVE AiService — OWNED BY CONTRIBUTOR 4.
// Real OpenRouter (LLM) + ElevenLabs (TTS + Scribe STT).
// Selected by AI_MODE=live in .env. Every LLM-backed method degrades to
// the deterministic mock on network/parse failure, so a dead key never
// breaks event creation, search, or the demo. Model output is sanitized
// before it touches the app: enums are clamped to the shared vocabulary
// and an unparseable date becomes null — never an invented one.
// =====================================================================

import { mockAi } from './mock';

const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVEN_VOICE = process.env.ELEVENLABS_TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVEN_STT_MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v1';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as EventCategory[];
const TAGS = Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[];

/** Thin OpenRouter chat helper (OpenAI-compatible). Returns assistant text. */
async function chat(system: string, user: string, jsonMode = false): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? '';
}

/** Models love wrapping JSON in ```json fences even in JSON mode. */
function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

/** Clamp raw model output to a valid ExtractedEvent. Throws if hopeless. */
function sanitizeExtracted(raw: any, transcript: string): ExtractedEvent {
  if (!raw || typeof raw !== 'object') throw new Error('not an object');
  const inEnum = <T extends string>(allowed: readonly T[], v: unknown): v is T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v);
  // an unparseable/garbage date becomes null — staff fills it on review
  let date_start: string | null = null;
  if (typeof raw.date_start === 'string' && raw.date_start) {
    const d = new Date(raw.date_start);
    if (!isNaN(d.getTime())) date_start = d.toISOString();
  }
  const cost: 'free' | 'paid' = raw.cost === 'paid' ? 'paid' : 'free';
  const amount = Number(raw.cost_amount);
  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 120) : transcript.slice(0, 80),
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : transcript,
    date_start,
    category: Array.isArray(raw.category) ? raw.category.filter((c: unknown) => inEnum(CATEGORIES, c)) : [],
    accommodation_tags: Array.isArray(raw.accommodation_tags)
      ? raw.accommodation_tags.filter((t: unknown) => inEnum(TAGS, t))
      : [],
    location_address: typeof raw.location_address === 'string' && raw.location_address.trim()
      ? raw.location_address.trim() : null,
    cost,
    cost_amount: cost === 'paid' && isFinite(amount) && amount > 0 ? amount : null,
  };
}

export const liveAi: AiService = {
  async simplify(description) {
    try {
      const out = await chat(
        'You rewrite event descriptions in plain language at about a grade-5 reading level. ' +
          'Short sentences. Common words. Keep key facts (what, when, cost, access). No preamble.',
        description,
      );
      return out.trim() || (await mockAi.simplify(description));
    } catch {
      return mockAi.simplify(description); // never block event creation on the LLM
    }
  },

  async extractEvent(transcript): Promise<ExtractedEvent> {
    const schema =
      '{ "title": string, "description": string, "date_start": string|null (ISO 8601), ' +
      `"category": string[] (from: ${CATEGORIES.join(',')}), ` +
      `"accommodation_tags": string[] (from: ${TAGS.join(',')}), ` +
      '"location_address": string|null, "cost": "free"|"paid", "cost_amount": number|null }';
    try {
      const raw = await chat(
        `Extract structured event fields from a staff member's spoken note. ` +
          `Return ONLY JSON matching: ${schema}. Use null when unsure. ` +
          `Only set date_start when the note states an unambiguous absolute date; ` +
          `relative dates ("this Friday") stay null — NEVER invent or guess a date.`,
        transcript,
        true,
      );
      return sanitizeExtracted(JSON.parse(stripFences(raw)), transcript);
    } catch {
      return mockAi.extractEvent(transcript); // safe fallback on network/parse failure
    }
  },

  async search(query, candidates: Event[]) {
    // Cheap approach: ask the model to rank a shortlist by id.
    const list = candidates
      .map((e) => `${e.id} :: ${e.title} — ${e.category.join(',')} — ${e.description.slice(0, 120)}`)
      .join('\n');
    try {
      const raw = await chat(
        'Rank the events by relevance to the user query. Return ONLY a JSON array of event ids, ' +
          'most relevant first, omitting irrelevant ones.',
        `Query: ${query}\n\nEvents:\n${list}`,
        true,
      );
      const parsed = JSON.parse(stripFences(raw));
      const ids = Array.isArray(parsed) ? parsed : parsed?.ids; // some models wrap: {"ids":[...]}
      const known = new Set(candidates.map((e) => e.id));
      return Array.isArray(ids)
        ? ids.filter((x): x is string => typeof x === 'string' && known.has(x))
        : [];
    } catch {
      return mockAi.search(query, candidates);
    }
  },

  async tts(text) {
    // No mock fallback here on purpose: the route 500s and the web hook
    // falls back to browser SpeechSynthesis, so read-aloud still works.
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  },

  async stt(audio, mimeType) {
    // ElevenLabs Scribe. ⚠️ Flagged risky in the MVP — verify latency/accuracy
    // against the real demo mic EARLY. No silent mock fallback: swapping real
    // speech for a canned transcript would publish wrong data — the voice UI
    // surfaces the error and offers the sample-transcript path instead.
    const form = new FormData();
    form.append('model_id', ELEVEN_STT_MODEL);
    form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), 'audio.webm');
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY },
      body: form as any,
    });
    if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    return data.text ?? '';
  },
};
