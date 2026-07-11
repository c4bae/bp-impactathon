import type { AiService, ExtractedEvent } from '../../../../shared/contracts';
import type { Event } from '../../../../shared/models';

// =====================================================================
// LIVE AiService — OWNED BY CONTRIBUTOR 4.
// Real OpenRouter (LLM) + ElevenLabs (TTS + Scribe STT).
// Everything below is a working skeleton with the exact wiring points
// marked `TODO(C4)`. Uses global fetch (Node 18+). No SDK required.
//
// Selected by AI_MODE=live in .env. Until you finish a method, you can
// delegate it to `mockAi` (imported below) so partial progress still runs.
// =====================================================================

import { mockAi } from './mock';

const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVEN_VOICE = process.env.ELEVENLABS_TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVEN_STT_MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v1';

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

export const liveAi: AiService = {
  async simplify(description) {
    const out = await chat(
      'You rewrite event descriptions in plain language at about a grade-5 reading level. ' +
        'Short sentences. Common words. Keep key facts (what, when, cost, access). No preamble.',
      description,
    );
    return out.trim() || (await mockAi.simplify(description));
  },

  async extractEvent(transcript): Promise<ExtractedEvent> {
    // TODO(C4): tune this prompt against real Scribe transcripts.
    const schema =
      '{ "title": string, "description": string, "date_start": string|null (ISO 8601), ' +
      '"category": string[] (from: arts,sports,education,social,health,employment,family,food,outdoors,tech), ' +
      '"accommodation_tags": string[] (from: wheelchair_access,step_free,asl_interpretation,sensory_friendly,' +
      'quiet_space,plain_language,service_animal_friendly,transportation_support,low_cost,mobility_support), ' +
      '"location_address": string|null, "cost": "free"|"paid", "cost_amount": number|null }';
    const raw = await chat(
      `Extract structured event fields from a staff member's spoken note. ` +
        `Return ONLY JSON matching: ${schema}. Use null when unsure; never invent a date.`,
      transcript,
      true,
    );
    try {
      return JSON.parse(raw) as ExtractedEvent;
    } catch {
      return mockAi.extractEvent(transcript); // safe fallback if JSON parse fails
    }
  },

  async search(query, candidates: Event[]) {
    // Cheap approach: ask the model to rank a shortlist by id.
    const list = candidates
      .map((e) => `${e.id} :: ${e.title} — ${e.category.join(',')} — ${e.description.slice(0, 120)}`)
      .join('\n');
    const raw = await chat(
      'Rank the events by relevance to the user query. Return ONLY a JSON array of event ids, ' +
        'most relevant first, omitting irrelevant ones.',
      `Query: ${query}\n\nEvents:\n${list}`,
      true,
    );
    try {
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [];
    } catch {
      return mockAi.search(query, candidates);
    }
  },

  async tts(text) {
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
    // against the real demo mic EARLY. Fall back to mock transcript on failure.
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
