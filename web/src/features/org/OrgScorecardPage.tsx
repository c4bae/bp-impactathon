// Contributor 4 — Org scorecard: where the accountability loop lands.
// Attendance + retention metrics, ranked blockers (server already applies
// the <5 suppression — we never see or reconstruct raw counts), and the
// resolve-gap action that flips a reported_gap badge to confirmed.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { AccessibilityBadge, Button, Card, Spinner } from '../../components/ui';
import {
  BARRIER_SUPPRESSION_THRESHOLD, BLOCKER_LABELS, type OrgScorecard,
} from '../../../../shared/models';

const pct = (n: number) => `${Math.round(n * 100)}%`;

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-bold text-brand-dark">{value}</p>
      <p className="font-medium mt-1">{label}</p>
      {hint && <p className="text-muted text-sm">{hint}</p>}
    </Card>
  );
}

export function OrgScorecardPage() {
  const { orgId } = useSession();
  const [card, setCard] = useState<OrgScorecard | null>(null);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState<string | null>(null); // event_id
  const [resolvedMsg, setResolvedMsg] = useState('');

  const load = useCallback(() => {
    setError('');
    api.scorecard(orgId).then(setCard)
      .catch(() => setError('Could not load the scorecard. Is the API running?'));
  }, [orgId]);
  useEffect(load, [load]);

  async function resolveGap(eventId: string, title: string) {
    setResolving(eventId);
    setResolvedMsg('');
    try {
      await api.resolveGap(orgId, eventId);
      setResolvedMsg(`"${title}" is now marked Accessibility confirmed. Seekers see the updated badge in their feed.`);
      load();
    } catch {
      setError('Could not resolve the gap. Please try again.');
    } finally {
      setResolving(null);
    }
  }

  if (error) {
    return (
      <p role="alert" className="text-badge-gap py-8 text-center">
        {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
      </p>
    );
  }
  if (!card) return <div className="flex justify-center py-16"><Spinner label="Loading scorecard" /></div>;

  const maxBlocker = Math.max(1, ...card.ranked_blockers.map((b) => b.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">{card.org_name}</h1>
        <p className="text-muted text-sm">Accessibility &amp; attendance scorecard</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Attendance rate" value={pct(card.attendance_rate)}
          hint={`${card.total_attended} of ${card.total_signups} signups`} />
        <StatCard label="Repeat attendees" value={pct(card.repeat_attendee_rate)}
          hint="attended 2+ events" />
        <StatCard label="Total signups" value={String(card.total_signups)} />
        <StatCard label="Events" value={String(card.event_count)} />
      </div>

      <Card>
        <h2 className="font-semibold mb-2">Barriers reported across your events</h2>
        {card.ranked_blockers.length === 0 ? (
          <p className="text-muted">No barriers reported above the privacy threshold.</p>
        ) : (
          <ol className="space-y-2">
            {card.ranked_blockers.map((b) => (
              <li key={b.blocker_reason} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm font-medium">{BLOCKER_LABELS[b.blocker_reason]}</span>
                <span
                  aria-hidden
                  className="h-4 rounded bg-badge-gap/70"
                  style={{ width: `${Math.max(8, (b.count / maxBlocker) * 100)}%` }}
                />
                <span className="text-sm tabular-nums">{b.count} report{b.count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-muted text-sm mt-3">
          To protect privacy, barrier counts under {BARRIER_SUPPRESSION_THRESHOLD} are never shown —
          here or anywhere else. Thresholds are demo values; a real deployment calibrates them with KW Hab.
        </p>
      </Card>

      {resolvedMsg && (
        <p role="status" aria-live="polite" className="rounded-lg bg-brand-light text-brand-dark px-4 py-3">
          ✓ {resolvedMsg}
        </p>
      )}

      <section aria-label="Your events">
        <h2 className="font-semibold mb-2">Your events</h2>
        <div className="space-y-3">
          {card.events.map((e) => (
            <Card key={e.event_id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{e.title}</h3>
                <AccessibilityBadge state={e.badge_state} />
              </div>
              <p className="text-muted text-sm mt-1">
                {e.signups} signup{e.signups === 1 ? '' : 's'} · {e.attended} attended
              </p>
              {e.blockers.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {e.blockers.map((b) => (
                    <li key={b.blocker_reason} className="text-sm text-badge-gap">
                      ⚠ {BLOCKER_LABELS[b.blocker_reason]} — reported {b.count} time{b.count === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
              )}
              {e.badge_state === 'reported_gap' && (
                <div className="mt-3">
                  <Button
                    type="button"
                    loading={resolving === e.event_id}
                    onClick={() => resolveGap(e.event_id, e.title)}
                    aria-label={`Resolve accessibility gap for ${e.title}`}
                  >
                    We've fixed this → Resolve gap
                  </Button>
                  <p className="text-muted text-sm mt-1">
                    Attests the barrier is fixed and updates your badge for seekers right away.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
