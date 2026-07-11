import { Router } from 'express';
import { query, one } from '../db';
import type { QuickPick, EventCategory } from '../../../shared/models';
import type { SubmitQuickPickBody } from '../../../shared/contracts';

export const quickpicks = Router();

const ALL_CATEGORIES: EventCategory[] = [
  'arts', 'sports', 'education', 'social', 'health',
  'employment', 'family', 'food', 'outdoors', 'tech',
];

// GET /api/quick-picks/today?user_id=  -> 3 categories the user hasn't
// responded to today (falls back to least-recently-seen).
quickpicks.get('/today', async (req, res) => {
  const userId = String(req.query.user_id || '');
  const seen = await query<{ event_category: EventCategory }>(
    `SELECT DISTINCT event_category FROM quick_picks
      WHERE user_id = $1 AND created_at::date = now()::date`,
    [userId],
  );
  const seenSet = new Set(seen.map((s) => s.event_category));
  const unseen = ALL_CATEGORIES.filter((c) => !seenSet.has(c));
  const pool = unseen.length >= 3 ? unseen : ALL_CATEGORIES;
  res.json({ categories: pool.slice(0, 3) });
});

// POST /api/quick-picks
quickpicks.post('/', async (req, res) => {
  const b = req.body as SubmitQuickPickBody;
  if (!b.user_id || !b.event_category || typeof b.response !== 'boolean') {
    return res.status(400).json({ error: 'missing_fields' });
  }
  const created = await one<QuickPick>(
    `INSERT INTO quick_picks (user_id, event_category, response)
     VALUES ($1, $2, $3) RETURNING *`,
    [b.user_id, b.event_category, b.response],
  );
  res.status(201).json(created);
});
