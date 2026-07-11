import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type EventDetail } from '../../api/client';
import { useSession } from '../../lib/session';
import { AccessibilityBadge, Button, Card, Spinner, TagChip } from '../../components/ui';
import {
  BLOCKER_LABELS,
  type AttendedState, type BadgeState, type BlockerReason, type Signup,
} from '../../../../shared/models';

// Contributor 3 — Screen: Post-event follow-up ("My Signups").
// One-tap attended/not, optional blocker reason. The follow-up prompt opens
// once the event has genuinely passed (date_end < now) — no demo-only
// trigger. api.reportAttendance() recomputes the badge server-side.
// See docs/contributor-3-accountability.md.

const ALL_BLOCKERS = Object.keys(BLOCKER_LABELS) as BlockerReason[];

const ATTENDED_COPY: Record<Exclude<AttendedState, 'not_yet_reported'>, string> = {
  yes: 'You went',
  no: 'You couldn’t make it',
  partial: 'You went for part of it',
};

export function MySignupsPage() {
  const { userId } = useSession();
  const [signups, setSignups] = useState<Signup[] | null>(null);
  const [events, setEvents] = useState<Record<string, EventDetail>>({});
  const [loadError, setLoadError] = useState(false);
  const [justReported, setJustReported] = useState<Record<string, BadgeState>>({});

  useEffect(() => {
    let cancelled = false;
    setSignups(null);
    setLoadError(false);
    setJustReported({});
    api.mySignups(userId).then(async (rows) => {
      if (cancelled) return;
      setSignups(rows);
      const ids = [...new Set(rows.map((s) => s.event_id))];
      const pairs = await Promise.all(ids.map(async (id) => {
        try { return [id, await api.event(id)] as const; } catch { return null; }
      }));
      if (cancelled) return;
      setEvents(Object.fromEntries(pairs.filter((p): p is readonly [string, EventDetail] => p !== null)));
    }, () => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [userId]);

  function handleReported(updated: Signup, badge: BadgeState) {
    setSignups((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
    setJustReported((prev) => ({ ...prev, [updated.id]: badge }));
    setEvents((prev) => {
      const ev = prev[updated.event_id];
      return ev ? { ...prev, [updated.event_id]: { ...ev, accessibility_badge_state: badge } } : prev;
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">My signups</h1>
      </div>

      {loadError && (
        <p role="alert" className="text-badge-gap">Couldn&rsquo;t load your signups — try reloading.</p>
      )}
      {!loadError && signups === null && <Spinner label="Loading your signups" />}
      {signups?.length === 0 && (
        <Card>
          <p>You haven&rsquo;t signed up for anything yet. <Link to="/feed" className="text-brand-dark underline">Browse events</Link> to find something near you.</p>
        </Card>
      )}

      <ul className="space-y-4">
        {signups?.map((signup) => (
          <li key={signup.id}>
            <SignupRow
              signup={signup}
              event={events[signup.event_id] ?? null}
              justReportedBadge={justReported[signup.id] ?? null}
              onReported={handleReported}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignupRow({ signup, event, justReportedBadge, onReported }: {
  signup: Signup;
  event: EventDetail | null;
  justReportedBadge: BadgeState | null;
  onReported: (updated: Signup, badge: BadgeState) => void;
}) {
  // 'no' | 'partial' answered, now on the optional "what got in the way?" step.
  const [pending, setPending] = useState<'no' | 'partial' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPast = event
    ? new Date(event.date_end ?? event.date_start).getTime() < Date.now()
    : false;
  const followUpOpen = signup.attended === 'not_yet_reported' && isPast;

  async function report(attended: AttendedState, blocker: BlockerReason | null) {
    setSubmitting(true);
    setError(null);
    try {
      const { event_badge_state, ...updated } = await api.reportAttendance(signup.id, attended, blocker);
      onReported(updated, event_badge_state as BadgeState);
      setPending(null);
    } catch {
      setError('Couldn’t save your report — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold">
          <Link to={`/events/${signup.event_id}`} className="hover:underline">
            {event?.title ?? 'Event'}
          </Link>
        </h2>
        {event && <AccessibilityBadge state={event.accessibility_badge_state} />}
      </div>
      {event && (
        <p className="text-muted text-sm mb-2">
          {new Date(event.date_start).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric',
          })}
          {event.location_address ? ` · ${event.location_address}` : ''}
        </p>
      )}
      {signup.needs_flagged.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-muted text-sm">You shared:</span>
          {signup.needs_flagged.map((tag) => <TagChip key={tag} tag={tag} />)}
        </div>
      )}

      {signup.attended !== 'not_yet_reported' ? (
        <div>
          <p>
            {ATTENDED_COPY[signup.attended]}
            {signup.blocker ? ` — ${BLOCKER_LABELS[signup.blocker].toLowerCase()} got in the way` : ''}.
          </p>
          {justReportedBadge && (
            <p role="status" className="mt-2 flex flex-wrap items-center gap-2">
              Thanks — your report is in. This event is now marked
              <AccessibilityBadge state={justReportedBadge} />
            </p>
          )}
        </div>
      ) : !followUpOpen ? (
        <p className="text-muted text-sm">We&rsquo;ll check in with you after the event.</p>
      ) : pending === null ? (
        <fieldset>
          <legend className="font-medium mb-2">Did you go?</legend>
          <div className="flex flex-wrap gap-2">
            <Button disabled={submitting} loading={submitting} onClick={() => void report('yes', null)}>
              Yes, I went
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={() => setPending('no')}>
              No
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={() => setPending('partial')}>
              Partly
            </Button>
          </div>
          {error && <p role="alert" className="text-badge-gap text-sm mt-2">{error}</p>}
        </fieldset>
      ) : (
        <fieldset>
          <legend className="font-medium mb-1">What got in the way?</legend>
          <p className="text-muted text-sm mb-2">
            Optional — this helps organizers fix real barriers. It goes to the
            organizer as an aggregated report, never tied to your name.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {ALL_BLOCKERS.map((reason) => (
              <Button
                key={reason}
                variant="secondary"
                disabled={submitting}
                onClick={() => void report(pending, reason)}
              >
                {BLOCKER_LABELS[reason]}
              </Button>
            ))}
            <Button disabled={submitting} loading={submitting} onClick={() => void report(pending, null)}>
              Prefer not to say
            </Button>
          </div>
          <Button variant="ghost" disabled={submitting} onClick={() => setPending(null)}>
            ← Back
          </Button>
          {error && <p role="alert" className="text-badge-gap text-sm mt-2">{error}</p>}
        </fieldset>
      )}
    </Card>
  );
}
