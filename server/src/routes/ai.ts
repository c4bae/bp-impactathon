import { Router } from 'express';
import multer from 'multer';
import { ai, AI_MODE } from '../services/ai';

export const aiRoutes = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Lets the web app show a "mock mode" banner and pick a TTS fallback.
aiRoutes.get('/status', (_req, res) => res.json({ mode: AI_MODE }));

// POST /api/ai/simplify { description } -> { plain_language }
aiRoutes.post('/simplify', async (req, res) => {
  const description = String(req.body?.description || '');
  if (!description) return res.status(400).json({ error: 'missing_description' });
  res.json({ plain_language: await ai.simplify(description) });
});

// POST /api/ai/extract { transcript } -> ExtractedEvent
aiRoutes.post('/extract', async (req, res) => {
  const transcript = String(req.body?.transcript || '');
  if (!transcript) return res.status(400).json({ error: 'missing_transcript' });
  res.json(await ai.extractEvent(transcript));
});

// POST /api/ai/tts { text } -> audio/mpeg (501 in mock mode -> client uses
// browser SpeechSynthesis fallback).
aiRoutes.post('/tts', async (req, res) => {
  const text = String(req.body?.text || '');
  if (!text) return res.status(400).json({ error: 'missing_text' });
  try {
    const audio = await ai.tts(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ error: err?.message || 'tts_failed' });
  }
});

// POST /api/ai/stt  multipart 'audio' -> { transcript }
aiRoutes.post('/stt', upload.single('audio'), async (req, res) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    // No file (e.g. mock/demo without a mic): return canned transcript.
    return res.json({ transcript: await ai.stt(Buffer.alloc(0), 'audio/webm') });
  }
  try {
    res.json({ transcript: await ai.stt(file.buffer, file.mimetype) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'stt_failed' });
  }
});
