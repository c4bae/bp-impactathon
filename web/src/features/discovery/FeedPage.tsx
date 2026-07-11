import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import {
  Card, Button, AccessibilityBadge, TagChip, Toggle, DistanceBadge, Spinner,
} from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type EventCategory, type RankedEvent,
} from '../../../../shared/models';
import { formatCost, formatEventDate } from './format';

const MAX_VISIBLE_TAGS = 3;

// Contributor 1 — Screen: ranked card feed. Reads filters from the query
// string (set by HomePage or the controls here) and re-fetches when the
// demo user changes so re-ranking is visible. Cards stay in server rank
// order (not date order) so "picked for you" is visibly personal.
export function FeedPage() {
  const { userId } = useSession();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categories = (params.get('categories')?.split(',').filter(Boolean) ?? []) as EventCategory[];
  const tags = (params.get('tags')?.split(',').filter(Boolean) ?? []) as AccommodationTag[];
  const freeOnly = params.get('free') === '1';
  const hasFilters = !!q || categories.length > 0 || tags.length > 0 || freeOnly;

  const [events, setEvents] = useState<RankedEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [searchText, setSearchText] = useState(q);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api.feed({
      user_id: userId,
      q: q || undefined,
      categories: categories.length ? categories : undefined,
      accommodation_tags: tags.length ? tags : undefined,
      max_cost: freeOnly ? 0 : undefined,
    })
      .then((evts) => { if (!cancelled) { setEvents(evts); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, params, attempt]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    const text = searchText.trim();
    if (text) next.set('q', text); else next.delete('q');
    setParams(next);
  }

  function clearFilters() {
    setSearchText('');
    setParams(new URLSearchParams());
  }

  const activeFilterLabels = [
    ...categories.map((c) => CATEGORY_LABELS[c]),
    ...tags.map((t) => ACCOMMODATION_LABELS[t]),
    ...(freeOnly ? ['Free only'] : []),
  ];

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events for you</h1>
        <p className="m-0 mt-1 text-muted">
          Best fit first · <Link to="/" className="text-brand-dark underline">change my answers</Link>
        </p>
      </div>

      <form onSubmit={submitSearch} role="search" className="flex gap-2">
        <label htmlFor="feed-search" className="sr-only">Search events in your own words</label>
        <input
          id="feed-search"
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder='Search — try "something quiet"'
          className="flex-1 min-h-[44px] px-5 rounded-full border border-black/10 bg-black/[0.03]"
        />
        <Button type="submit" variant="secondary" className="rounded-full">Search</Button>
      </form>

      {activeFilterLabels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {activeFilterLabels.map((label) => (
            <span key={label} className="rounded-full bg-brand-light text-brand-dark px-3 py-1">{label}</span>
          ))}
          <Button variant="ghost" onClick={clearFilters} className="text-sm rounded-full">Clear</Button>
        </div>
      )}

      {status === 'loading' && (
        <p className="flex items-center gap-2 text-muted"><Spinner /> Finding events for you…</p>
      )}

      {status === 'error' && (
        <Card role="alert" className="p-6 rounded-2xl">
          <p className="mb-3">Something went wrong loading events. It's not you — let's try again.</p>
          <Button onClick={() => setAttempt((a) => a + 1)} className="rounded-full">Try again</Button>
        </Card>
      )}

      {status === 'ready' && events.length === 0 && (
        <Card className="p-6 rounded-2xl text-center">
          <p className="mb-3">
            No events match right now.
            {hasFilters ? ' Try removing a filter or two.' : ' Please check back soon.'}
          </p>
          {hasFilters && <Button onClick={clearFilters} className="rounded-full">Show me everything</Button>}
        </Card>
      )}

      {status === 'ready' && events.length > 0 && (
        <ul className="flex flex-col gap-4 list-none p-0 m-0">
          {events.map((ev) => (
            <li key={ev.id}>
              <EventCard ev={ev} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({ ev }: { ev: RankedEvent }) {
  const { speak, stop, speaking } = useReadAloud();
  useEffect(() => stop, [stop]); // don't keep talking after the card unmounts
  const oneLiner = ev.plain_language_description ?? ev.description;
  const hiddenTagCount = ev.accommodation_tags.length - MAX_VISIBLE_TAGS;

  return (
    <Card aria-labelledby={`ev-${ev.id}-title`} className="p-5 rounded-2xl flex flex-col gap-2.5">
      <p className="m-0 text-sm text-muted flex items-center gap-2 flex-wrap">
        <span>{formatEventDate(ev.date_start, ev.date_end)}</span>
        <span aria-hidden>·</span>
        <span>{formatCost(ev.cost, ev.cost_amount)}</span>
        <DistanceBadge km={ev.distance_km} />
      </p>

      <div>
        <h2 id={`ev-${ev.id}-title`} className="text-xl font-semibold leading-snug">
          <Link to={`/events/${ev.id}`} className="text-ink hover:text-brand-dark hover:underline">
            {ev.title}
          </Link>
        </h2>
        <p className="m-0 text-sm text-muted">{ev.org_name}</p>
      </div>

      <p className="m-0">{oneLiner}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <AccessibilityBadge state={ev.accessibility_badge_state} />
        {ev.accommodation_tags.slice(0, MAX_VISIBLE_TAGS).map((t) => <TagChip key={t} tag={t} />)}
        {hiddenTagCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm text-muted">
            +{hiddenTagCount} more
          </span>
        )}
      </div>

      {ev.score_reasons.length > 0 && (
        <p className="m-0 text-xs text-muted">
          Picked for you: {ev.score_reasons.join(' · ')}
        </p>
      )}

      <div className="mt-1">
        <Toggle
          pressed={speaking}
          label={speaking ? 'Stop reading' : 'Read this aloud'}
          onToggle={() => (speaking ? stop() : speak(`${ev.title}. ${oneLiner}`))}
        />
      </div>
    </Card>
  );
}
