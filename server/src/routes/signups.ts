import { Router } from 'express';
import { query, one } from '../db';
import { recomputeBadge } from '../badges';
import type { Signup } from '../../../shared/models';
import type { CreateSignupBody, UpdateSignupBody } from '../../../shared/contracts';

export const signups = Router();

// GET /api/signups?user_id=
signups.get('/', async (req, res) => {
  const userId = String(req.query.user_id || '');
  const rows = await query<Signup>(
    `SELECT * FROM signups WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  res.json(rows);
});

// POST /api/signups
signups.post('/', async (req, res) => {
  const b = req.body as CreateSignupBody;
  if (!b.user_id || !b.event_id) return res.status(400).json({ error: 'missing_fields' });
  const created = await one<Signup>(
    `INSERT INTO signups (user_id, event_id, needs_flagged)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, event_id)
       DO UPDATE SET needs_flagged = EXCLUDED.needs_flagged
     RETURNING *`,
    [b.user_id, b.event_id, b.needs_flagged || []],
  );
  res.status(201).json(created);
});

// PATCH /api/signups/:id  -> record attendance + optional blocker,
// then recompute the event badge SYNCHRONOUSLY (the spine's feedback loop).
signups.patch('/:id', async (req, res) => {
  const b = req.body as UpdateSignupBody;
  const updated = await one<Signup>(
    `UPDATE signups SET attended = $1, blocker = $2 WHERE id = $3 RETURNING *`,
    [b.attended, b.blocker ?? null, req.params.id],
  );
  if (!updated) return res.status(404).json({ error: 'not_found' });
  const badge_state = await recomputeBadge(updated.event_id);
  res.json({ ...updated, event_badge_state: badge_state });
});
