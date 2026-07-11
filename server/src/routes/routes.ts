import { Router } from 'express';
import { one } from '../db';
import type { Route } from '../../../shared/models';

export const routes = Router();

// GET /api/routes/:eventId  -> hand-authored route for that event, or 404.
routes.get('/:eventId', async (req, res) => {
  const route = await one<Route>(
    `SELECT * FROM routes WHERE event_id = $1 LIMIT 1`,
    [req.params.eventId],
  );
  if (!route) return res.status(404).json({ error: 'no_route' });
  res.json(route);
});
