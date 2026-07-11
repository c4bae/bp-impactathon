import { Router } from 'express';
import { query, one } from '../db';
import type { QuickPick } from '../../../shared/models';
import type { SubmitQuickPickBody, QuickPickCandidate } from '../../../shared/contracts';

export const quickpicks = Router();

const CANDIDATE_FIELDS = `
  e.id, e.title, e.plain_language_description, e.description,
  e.category, e.accommodation_tags, e.date_start, e.cost, e.cost_amount,
  e.accessibility_badge_state, o.name AS org_name
`;

// GET /api/quick-picks/today?user_id=  -> 3 upcoming events the user hasn't
// swiped on yet and isn't already signed up for (no point asking "are you
// interested?" about something already decided). Falls back to ignoring
// swipe history (but still excludes signed-up events) once that pool runs
// dry, so the deck never goes empty.
quickpicks.get('/today', async (req, res) => {
  const userId = String(req.query.user_id || '');
  const N = 3;

  let candidates = await query<QuickPickCandidate>(
    `SELECT ${CANDIDATE_FIELDS}
       FROM events e JOIN orgs o ON o.id = e.org_id
      WHERE e.date_start > now()
        AND NOT EXISTS (SELECT 1 FROM quick_picks qp WHERE qp.user_id = $1 AND qp.event_id = e.id)
        AND NOT EXISTS (SELECT 1 FROM signups s WHERE s.user_id = $1 AND s.event_id = e.id)
      ORDER BY random()
      LIMIT $2`,
    [userId, N],
  );

  if (candidates.length < N) {
    candidates = await query<QuickPickCandidate>(
      `SELECT ${CANDIDATE_FIELDS}
         FROM events e JOIN orgs o ON o.id = e.org_id
        WHERE e.date_start > now()
          AND NOT EXISTS (SELECT 1 FROM signups s WHERE s.user_id = $1 AND s.event_id = e.id)
        ORDER BY random()
        LIMIT $2`,
      [userId, N],
    );
  }

  res.json({ events: candidates });
});

// POST /api/quick-picks
quickpicks.post('/', async (req, res) => {
  const b = req.body as SubmitQuickPickBody;
  if (!b.user_id || !b.event_id || typeof b.response !== 'boolean') {
    return res.status(400).json({ error: 'missing_fields' });
  }
  const created = await one<QuickPick>(
    `INSERT INTO quick_picks (user_id, event_id, response)
     VALUES ($1, $2, $3) RETURNING *`,
    [b.user_id, b.event_id, b.response],
  );
  res.status(201).json(created);
});
