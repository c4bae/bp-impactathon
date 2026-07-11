import type { AiService } from '../../../../shared/contracts';
import { mockAi } from './mock';
import { liveAi } from './live';

// Chosen once at boot. AI_MODE=live uses real OpenRouter/ElevenLabs;
// anything else (default) uses the offline deterministic mock.
export const ai: AiService = process.env.AI_MODE === 'live' ? liveAi : mockAi;

export const AI_MODE = process.env.AI_MODE === 'live' ? 'live' : 'mock';
