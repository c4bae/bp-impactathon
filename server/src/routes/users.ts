import { Router } from 'express';
import { query, one } from '../db';
import type { User } from '../../../shared/models';

export const users = Router();

// GET /api/users  -> all seeded users (for the no-auth demo user switcher)
users.get('/', async (_req, res) => {
  res.json(await query<User>(`SELECT * FROM users ORDER BY created_at ASC`));
});

// GET /api/users/:id
users.get('/:id', async (req, res) => {
  const user = await one<User>(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json(user);
});
