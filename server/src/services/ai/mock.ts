import type { AiService, ExtractedEvent } from '../../../../shared/contracts';
import type { Event, EventCategory, AccommodationTag } from '../../../../shared/models';

// =====================================================================
// MOCK AiService — deterministic, offline, no keys. This is what C1/C2/C3
// develop against, and the demo-safe fallback. Contributor 4 provides the
// real impl in ./live.ts behind the identical interface.
// =====================================================================

function plainify(text: string): string {
  // A crude but deterministic "simplifier": short sentences, common words.
  const first = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const out = first.map((s) => (s.length > 90 ? s.slice(0, 87) + '…' : s)).join('. ');
  return (out || text).replace(/\butilize\b/gi, 'use').replace(/\bassist\b/gi, 'help') + '.';
}

const CATEGORY_KEYWORDS: Record<string, EventCategory> = {
  paint: 'arts', art: 'arts', music: 'arts',
  basketball: 'sports', run: 'sports', swim: 'sports',
  resume: 'employment', job: 'employment', interview: 'employment',
  cook: 'food', meal: 'food', kitchen: 'food',
  walk: 'outdoors', trail: 'outdoors', nature: 'outdoors',
  library: 'education', class: 'education', learn: 'education',
  social: 'social', meet: 'social', drop: 'social',
};

const TAG_KEYWORDS: Record<string, AccommodationTag> = {
  wheelchair: 'wheelchair_access', 'step-free': 'step_free', 'step free': 'step_free',
  asl: 'asl_interpretation', sensory: 'sensory_friendly', quiet: 'quiet_space',
  'plain language': 'plain_language', 'service animal': 'service_animal_friendly',
  bus: 'transportation_support', transit: 'transportation_support', free: 'low_cost',
};

function scanEnum<T>(text: string, map: Record<string, T>): T[] {
  const lower = text.toLowerCase();
  const found = new Set<T>();
  for (const [k, v] of Object.entries(map)) if (lower.includes(k)) found.add(v as T);
  return [...found];
}

export const mockAi: AiService = {
  async simplify(description) {
    return plainify(description);
  },

  async extractEvent(transcript): Promise<ExtractedEvent> {
    const cats = scanEnum(transcript, CATEGORY_KEYWORDS);
    const tags = scanEnum(transcript, TAG_KEYWORDS);
    const costMatch = transcript.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
    // "free" wins over a stray price; otherwise a $amount means paid.
    const isFree = /\bfree\b/i.test(transcript) || !costMatch;
    // First sentence -> title (trimmed), whole thing -> description.
    const title =
      transcript.split(/[.!?\n]/)[0]?.trim().slice(0, 80) || 'Untitled event';
    return {
      title,
      description: transcript.trim(),
      date_start: null, // mock does not resolve dates; staff fills on review
      category: cats.length ? cats : ['social'],
      accommodation_tags: tags,
      location_address: null,
      cost: isFree ? 'free' : 'paid',
      cost_amount: isFree ? null : parseFloat(costMatch![1]),
    };
  },

  async search(query, candidates: Event[]) {
    // Deterministic keyword overlap ranking.
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    return candidates
      .map((e) => {
        const hay = `${e.title} ${e.description} ${e.category.join(' ')} ${e.accommodation_tags.join(' ')}`.toLowerCase();
        const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
        return { id: e.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score > 0)
      .map((r) => r.id);
  },

  async tts(_text) {
    // No audio offline. The web read-aloud hook falls back to the browser's
    // SpeechSynthesis when the server returns 501, so this never blocks C1.
    throw Object.assign(new Error('TTS not available in mock mode'), { statusCode: 501 });
  },

  async stt(_audio, _mime) {
    // Deterministic canned transcript so the voice-admin REVIEW screen is
    // demoable without a mic or key. C4 replaces with ElevenLabs Scribe.
    return (
      'Community drop-in this Saturday at two pm at the Waterloo library. ' +
      'It is free. The space is sensory friendly and step free. Plain language support available.'
    );
  },
};
