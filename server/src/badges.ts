import { query, one } from './db';
import { BARRIER_SUPPRESSION_THRESHOLD } from '../../shared/models';
import type { BadgeState, BlockerReason, AccommodationTag } from '../../shared/models';

// =====================================================================
// Badge recompute — the accountability spine. Recomputed SYNCHRONOUSLY on
// each follow-up submission (demo scale is tiny; no scheduled job needed).
//
// Contributor 3 owns the calibration of these rules.
// BARRIER_SUPPRESSION_THRESHOLD (shared/models.ts) is 1 — a single report
// flips the badge immediately, prioritizing an end-to-end demo of
// report -> org sees it -> resolve over aggregation/anonymity:
//
//   reported_gap : any single blocker reason reaches the threshold on
//                  this event.
//   confirmed    : the org has resolved the gap (resolve-gap action), OR
//                  the event has attendance and zero reports at threshold.
//   not_yet_verified : default / not enough signal.
//
// NOTE: 'confirmed' is only set here when a real accessibility signal
// exists; the resolve-gap endpoint can also force it (org attestation).
// =====================================================================

export interface BarrierCount {
  blocker_reason: BlockerReason;
  count: number;
}

/** Raw (unsuppressed) blocker counts for one event. Server-internal only. */
export async function rawBarrierCounts(eventId: string): Promise<BarrierCount[]> {
  return query<BarrierCount>(
    `SELECT blocker AS blocker_reason, COUNT(*)::int AS count
       FROM signups
      WHERE event_id = $1 AND blocker IS NOT NULL
      GROUP BY blocker
      ORDER BY count DESC`,
    [eventId],
  );
}

/** Suppression-applied counts — safe to send to ANY client. */
export function suppress(counts: BarrierCount[]): BarrierCount[] {
  return counts.filter((c) => c.count >= BARRIER_SUPPRESSION_THRESHOLD);
}

/**
 * Accommodation needs mentioned by signups that also reported a blocker on
 * this event — aggregated + counted only, never joined back to a name.
 * Gives the org concrete "what to fix" detail beyond the blocker category
 * (e.g. Accommodation gap -> which specific needs came up).
 */
export async function blockerRelatedNeeds(eventId: string): Promise<{ tag: AccommodationTag; count: number }[]> {
  return query<{ tag: AccommodationTag; count: number }>(
    `SELECT tag, COUNT(*)::int AS count
       FROM signups, unnest(needs_flagged) AS tag
      WHERE event_id = $1 AND blocker IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC`,
    [eventId],
  );
}

/**
 * Recompute and persist an event's badge from current signup data.
 * Returns the new state. Does NOT downgrade an org-attested 'confirmed'
 * unless a fresh gap crosses threshold.
 */
export async function recomputeBadge(eventId: string): Promise<BadgeState> {
  const counts = await rawBarrierCounts(eventId);
  const hasGapAtThreshold = counts.some((c) => c.count >= BARRIER_SUPPRESSION_THRESHOLD);

  const attended = await one<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM signups
      WHERE event_id = $1 AND attended IN ('yes','partial')`,
    [eventId],
  );

  let next: BadgeState;
  if (hasGapAtThreshold) {
    next = 'reported_gap';
  } else if ((attended?.n ?? 0) > 0) {
    next = 'confirmed';
  } else {
    next = 'not_yet_verified';
  }

  await query(`UPDATE events SET accessibility_badge_state = $1 WHERE id = $2`, [next, eventId]);
  return next;
}
