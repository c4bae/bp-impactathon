import { Router } from 'express';
import { query, one } from '../db';
import { rawBarrierCounts, suppress, recomputeBadge } from '../badges';
import type { OrgScorecard, Event } from '../../../shared/models';
import type { ResolveGapBody } from '../../../shared/contracts';

export const org = Router();

// GET /api/orgs  -> all seeded orgs (for the no-auth demo org switcher)
org.get('/', async (_req, res) => {
  res.json(await query(`SELECT * FROM orgs ORDER BY created_at ASC`));
});

// GET /api/orgs/:id/scorecard  -> signups vs attendance, ranked blockers
// (suppression applied), retention. Contributor 4 renders this.
org.get('/:id/scorecard', async (req, res) => {
  const orgId = req.params.id;
  const orgRow = await one<{ id: string; name: string }>(
    `SELECT id, name FROM orgs WHERE id = $1`, [orgId],
  );
  if (!orgRow) return res.status(404).json({ error: 'not_found' });

  const events = await query<Event & { signups: number; attended: number }>(
    `SELECT e.*,
            COUNT(s.id)::int AS signups,
            COUNT(s.id) FILTER (WHERE s.attended IN ('yes','partial'))::int AS attended
       FROM events e LEFT JOIN signups s ON s.event_id = e.id
      WHERE e.org_id = $1
      GROUP BY e.id
      ORDER BY e.date_start ASC`,
    [orgId],
  );

  const perEvent = [];
  const orgBlockerTotals = new Map<string, number>();
  let totalSignups = 0, totalAttended = 0;

  for (const e of events) {
    const blockers = suppress(await rawBarrierCounts(e.id));
    for (const b of blockers) {
      orgBlockerTotals.set(b.blocker_reason, (orgBlockerTotals.get(b.blocker_reason) || 0) + b.count);
    }
    totalSignups += e.signups;
    totalAttended += e.attended;
    perEvent.push({
      event_id: e.id,
      title: e.title,
      signups: e.signups,
      attended: e.attended,
      badge_state: e.accessibility_badge_state,
      blockers,
    });
  }

  // repeat-attendee rate: users who attended >= 2 of THIS org's events.
  const repeat = await one<{ repeat: number; total: number }>(
    `WITH att AS (
       SELECT s.user_id, COUNT(*) AS n
         FROM signups s JOIN events e ON e.id = s.event_id
        WHERE e.org_id = $1 AND s.attended IN ('yes','partial')
        GROUP BY s.user_id
     )
     SELECT COUNT(*) FILTER (WHERE n >= 2)::int AS repeat,
            COUNT(*)::int AS total
       FROM att`,
    [orgId],
  );

  const scorecard: OrgScorecard = {
    org_id: orgRow.id,
    org_name: orgRow.name,
    event_count: events.length,
    total_signups: totalSignups,
    total_attended: totalAttended,
    attendance_rate: totalSignups ? Math.round((totalAttended / totalSignups) * 100) / 100 : 0,
    repeat_attendee_rate: repeat?.total ? Math.round((repeat.repeat / repeat.total) * 100) / 100 : 0,
    ranked_blockers: [...orgBlockerTotals.entries()]
      .map(([blocker_reason, count]) => ({ blocker_reason: blocker_reason as any, count }))
      .sort((a, b) => b.count - a.count),
    events: perEvent,
  };
  res.json(scorecard);
});

// POST /api/orgs/:id/events/:eventId/resolve-gap
// Org attests they fixed the gap. Clears the reported blockers for that
// event and flips the badge to 'confirmed' (org attestation path).
org.post('/:id/events/:eventId/resolve-gap', async (req, res) => {
  const { eventId } = req.params;
  const _b = req.body as ResolveGapBody;
  // Demo behaviour: mark the event's reported blockers resolved by clearing
  // them (so the aggregate drops below threshold), then force-confirm.
  await query(
    `UPDATE signups SET blocker = NULL WHERE event_id = $1 AND blocker IS NOT NULL`,
    [eventId],
  );
  await recomputeBadge(eventId); // will now be confirmed/verified from data
  const event = await one<Event>(
    `UPDATE events SET accessibility_badge_state = 'confirmed' WHERE id = $1 RETURNING *`,
    [eventId],
  );
  if (!event) return res.status(404).json({ error: 'not_found' });
  res.json(event);
});
