import { Router } from 'express';
import { query, one } from '../db';
import { distanceKm } from '../geo';
import { ai } from '../services/ai';
import type {
  Event, RankedEvent, User, EventCategory, AccommodationTag,
} from '../../../shared/models';
import type { CreateEventBody, UpdateEventBody } from '../../../shared/contracts';

export const events = Router();

// =====================================================================
// Ranking heuristic (Contributor 2 tunes the WEIGHTS; the query shape is
// fixed here so the feed is stable). Honest v1: a weighted count, no ML.
//   + quick-pick affinity for matching categories
//   + overlap with the user's saved accommodation_needs
//   + proximity (closer = higher)
//   + soonness (sooner = higher)
//   + confirmed badge bonus / reported_gap is NOT hidden, just not boosted
// =====================================================================
const W = {
  quickPick: 3,
  accommodationMatch: 2.5,
  proximity: 2,
  soon: 1.5,
  confirmedBadge: 1,
};

// GET /api/events?user_id=&q=&categories=&accommodation_tags=&max_cost=
events.get('/', async (req, res) => {
  const userId = String(req.query.user_id || '');
  const q = req.query.q ? String(req.query.q) : '';
  const filterCats = csv(req.query.categories) as EventCategory[];
  const filterTags = csv(req.query.accommodation_tags) as AccommodationTag[];
  const maxCost = req.query.max_cost ? Number(req.query.max_cost) : null;

  const user = userId
    ? await one<User>(`SELECT * FROM users WHERE id = $1`, [userId])
    : null;

  // Candidate set (upcoming first). Apply hard filters in SQL.
  const rows = await query<Event & { org_name: string }>(
    `SELECT e.*, o.name AS org_name
       FROM events e JOIN orgs o ON o.id = e.org_id
      WHERE ($1::event_category[] IS NULL OR e.category && $1)
        AND ($2::accommodation_tag[] IS NULL OR e.accommodation_tags @> $2)
        AND ($3::numeric IS NULL OR e.cost = 'free' OR e.cost_amount <= $3)
      ORDER BY e.date_start ASC`,
    [filterCats.length ? filterCats : null,
     filterTags.length ? filterTags : null,
     maxCost],
  );

  // Optional natural-language search narrows + orders the candidate set.
  let ordered = rows;
  if (q) {
    const ids = await ai.search(q, rows);
    if (ids.length) {
      const rank = new Map(ids.map((id, i) => [id, i]));
      ordered = rows
        .filter((e) => rank.has(e.id))
        .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
  }

  // Quick-pick affinity for this user. Quick Picks records swipes on
  // specific EVENTS, not categories — derive category affinity from what
  // the swiped events have in common. A single swipe nudges every category
  // on that event (e.g. liking an "arts, social" event bumps both).
  const picks = user
    ? await query<{ category: EventCategory[]; response: boolean }>(
        `SELECT e.category, qp.response
           FROM quick_picks qp JOIN events e ON e.id = qp.event_id
          WHERE qp.user_id = $1`,
        [user.id],
      )
    : [];
  const affinity = new Map<EventCategory, number>();
  for (const p of picks) {
    for (const c of p.category) affinity.set(c, (affinity.get(c) || 0) + (p.response ? 1 : -1));
  }

  const now = Date.now();
  const ranked: RankedEvent[] = ordered.map((e) => {
    const reasons: string[] = [];
    let score = 0;

    // quick-pick affinity — capped so casual swipe activity nudges ranking
    // without being able to unboundedly outweigh accessibility fit, which
    // matters more for this product than general interest.
    const rawAff = e.category.reduce((n, c) => n + (affinity.get(c) || 0), 0);
    const aff = Math.max(-2, Math.min(2, rawAff));
    if (aff > 0) { score += W.quickPick * aff; reasons.push('matches your Quick Picks'); }

    // accommodation overlap with saved needs
    const overlap = user
      ? e.accommodation_tags.filter((t) => user.accommodation_needs.includes(t)).length
      : 0;
    if (overlap > 0) { score += W.accommodationMatch * overlap; reasons.push('fits your access needs'); }

    // proximity
    let distance_km: number | null = null;
    if (user?.saved_lat != null && e.location_lat != null && e.location_lng != null) {
      distance_km = distanceKm(user.saved_lat, user.saved_lng!, e.location_lat, e.location_lng);
      score += W.proximity / (1 + distance_km); // closer -> bigger
      if (distance_km <= 3) reasons.push('close to you');
    }

    // soonness (decay over ~14 days)
    const days = Math.max(0, (new Date(e.date_start).getTime() - now) / 86_400_000);
    score += W.soon * Math.max(0, 1 - days / 14);

    // badge nudge (do NOT hide reported_gap — transparency is the point)
    if (e.accessibility_badge_state === 'confirmed') {
      score += W.confirmedBadge; reasons.push('accessibility confirmed');
    }

    return { ...e, org_name: e.org_name, distance_km, score: Math.round(score * 100) / 100, score_reasons: reasons };
  });

  // If no NL query, sort by score. If NL query, AI order already leads;
  // keep it but still expose scores.
  if (!q) ranked.sort((a, b) => b.score - a.score);
  res.json(ranked);
});

// GET /api/events/:id  -> event + org_name + optional route
events.get('/:id', async (req, res) => {
  const event = await one<Event & { org_name: string }>(
    `SELECT e.*, o.name AS org_name FROM events e JOIN orgs o ON o.id = e.org_id WHERE e.id = $1`,
    [req.params.id],
  );
  if (!event) return res.status(404).json({ error: 'not_found' });
  const route = await one(`SELECT * FROM routes WHERE event_id = $1 LIMIT 1`, [event.id]);
  res.json({ ...event, route });
});

// POST /api/events  (form OR voice-confirmed). Simplifies if not provided.
events.post('/', async (req, res) => {
  const b = req.body as CreateEventBody;
  if (!b.org_id || !b.title || !b.description || !b.date_start) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }
  const plain = b.plain_language_description ?? (await ai.simplify(b.description));
  const created = await one<Event>(
    `INSERT INTO events
      (org_id, title, description, plain_language_description, category, date_start, date_end,
       cost, cost_amount, age_group, location_address, location_lat, location_lng,
       accommodation_tags, created_via)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [b.org_id, b.title, b.description, plain, b.category || [], b.date_start, b.date_end ?? null,
     b.cost, b.cost_amount ?? null, b.age_group ?? null, b.location_address ?? null,
     b.location_lat ?? null, b.location_lng ?? null, b.accommodation_tags || [], b.created_via || 'form'],
  );
  res.status(201).json(created);
});

// PATCH /api/events/:id — partial update (calendar edit flow). Whitelisted
// columns only; if the description changes without an explicit plain-language
// override, re-simplify so the two never drift apart.
const UPDATABLE = [
  'title', 'description', 'plain_language_description', 'category',
  'date_start', 'date_end', 'cost', 'cost_amount', 'age_group',
  'location_address', 'location_lat', 'location_lng', 'accommodation_tags',
] as const satisfies readonly (keyof UpdateEventBody)[];

events.patch('/:id', async (req, res) => {
  const b = req.body as UpdateEventBody;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const col of UPDATABLE) {
    if (b[col] !== undefined) {
      vals.push(b[col]);
      sets.push(`${col} = $${vals.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'no_fields' });
  if (b.description !== undefined && b.plain_language_description === undefined) {
    vals.push(await ai.simplify(b.description));
    sets.push(`plain_language_description = $${vals.length}`);
  }
  vals.push(req.params.id);
  const updated = await one<Event>(
    `UPDATE events SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals,
  );
  if (!updated) return res.status(404).json({ error: 'not_found' });
  res.json(updated);
});

// DELETE /api/events/:id — signups/routes cascade (see db/schema.sql).
events.delete('/:id', async (req, res) => {
  const gone = await one<{ id: string }>(
    `DELETE FROM events WHERE id = $1 RETURNING id`, [req.params.id],
  );
  if (!gone) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

function csv(v: unknown): string[] {
  if (!v) return [];
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}
