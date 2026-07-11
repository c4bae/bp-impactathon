import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { Button, Card, Spinner, AccessibilityBadge } from '../../components/ui';
import { EventCover } from '../discovery/covers';
import { formatCost, formatEventDate } from '../discovery/format';
import type { QuickPickCandidate } from '../../../../shared/contracts';

// Contributor 2 — Quick Picks: daily swipe deck of specific EVENTS (not
// broad categories). Each vote feeds the ranking heuristic behind /feed —
// the server derives category affinity from what the swiped events have in
// common, so this screen just needs to submit the swipe. `embedded` lets it
// render inline at the top of Discover instead of as its own /quick-picks
// destination (both routes still work).
export function QuickPicksPage({ embedded = false }: { embedded?: boolean }) {
  const { userId } = useSession();
  const [events, setEvents] = useState<QuickPickCandidate[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setIndex(0);
    setLoadError(false);
    setSubmitNote(null);
    api.quickPicksToday(userId)
      .then((r) => { if (!cancelled) setEvents(r.events); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [userId]);

  function vote(eventId: string, response: boolean) {
    // Optimistic: advance immediately; a failed save is noted but never
    // retreats the card.
    api.submitQuickPick(userId, eventId, response).catch(() =>
      setSubmitNote('One answer failed to save — it may not count toward your feed today.'),
    );
    setIndex((i) => i + 1);
  }

  if (loadError) {
    return (
      <Card className={`${embedded ? 'w-full' : 'max-w-md mx-auto'} text-center`}>
        <p className="mb-3">Could not load today’s Quick Picks.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  if (events === null) {
    return (
      <div className={`flex justify-center ${embedded ? 'py-6' : 'py-12'}`}>
        <Spinner label="Loading Quick Picks" />
      </div>
    );
  }

  const done = index >= events.length;

  if (done) {
    const Heading = embedded ? 'h2' : 'h1';
    return (
      <Card className={`${embedded ? 'w-full bg-brand-light/60 border-brand/20' : 'max-w-md mx-auto'} text-center`}>
        <Heading className="text-2xl font-semibold mb-2">
          {events.length > 0 ? 'That’s it for today!' : 'All caught up!'}
        </Heading>
        <p className={`text-muted ${embedded ? 'mb-0' : 'mb-4'}`}>
          Your picks help us rank events you’ll actually like. Come back tomorrow for more.
        </p>
        {!embedded && (
          <Link
            to="/feed"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg font-medium bg-brand text-white hover:bg-brand-dark"
          >
            See your feed
          </Link>
        )}
      </Card>
    );
  }

  const ev = events[index];
  const oneLiner = ev.plain_language_description ?? ev.description;
  const Heading = embedded ? 'h2' : 'h1';

  return (
    <section aria-labelledby={embedded ? 'quick-picks-heading' : undefined} className={embedded ? 'w-full' : 'max-w-md mx-auto'}>
      <div className="flex items-center justify-between mb-4">
        <Heading id={embedded ? 'quick-picks-heading' : undefined} className="text-2xl font-semibold">
          Quick Picks
        </Heading>
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {events.map((e, i) => (
              <span
                key={e.id}
                className={`h-2.5 w-2.5 rounded-full ${i < index ? 'bg-brand' : i === index ? 'bg-brand-dark' : 'bg-black/15'}`}
              />
            ))}
          </span>
          <span className="text-sm text-muted">{index + 1} of {events.length}</span>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Event {index + 1} of {events.length}: {ev.title}
      </p>

      <Card className={`text-center ${embedded ? 'py-6 bg-brand-light/60 border-brand/20' : 'py-8'}`}>
        <EventCover title={ev.title} category={ev.category} className="w-full h-32 mb-4" />
        <h3 className="text-xl font-semibold mb-1">{ev.title}</h3>
        <p className="text-muted text-sm mb-2">
          {ev.org_name} · {formatEventDate(ev.date_start)} · {formatCost(ev.cost, ev.cost_amount)}
        </p>
        <div className="flex justify-center mb-3">
          <AccessibilityBadge state={ev.accessibility_badge_state} />
        </div>
        <p className="mb-6 text-left sm:text-center">{oneLiner}</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => vote(ev.id, true)} className="min-w-[130px] text-lg">
            Interested
          </Button>
          <Button variant="secondary" onClick={() => vote(ev.id, false)} className="min-w-[130px] text-lg">
            Not for me
          </Button>
        </div>
      </Card>

      {submitNote && <p role="alert" className="text-badge-gap text-sm mt-3">{submitNote}</p>}
    </section>
  );
}
