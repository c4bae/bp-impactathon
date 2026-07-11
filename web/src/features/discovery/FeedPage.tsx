import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import {
  Card, Button, AccessibilityBadge, Toggle, DistanceBadge, Spinner,
} from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type EventCategory, type RankedEvent,
} from '../../../../shared/models';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCost, formatEventDate } from './format';
import { CATEGORY_ICONS, EventCover } from './covers';
import { EventDetailPanel } from './EventDetailPanel';

// Contributor 1 — the single Discover screen (served at both / and /feed).
// Content-first: ranked events immediately, with search, category pills,
// and a collapsed "comfort & cost" filter row. Cards are lean — details
// live on the event page. Re-fetches when the demo user changes.
export function FeedPage() {
  const { userId } = useSession();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categories = (params.get('categories')?.split(',').filter(Boolean) ?? []) as EventCategory[];
  const tags = (params.get('tags')?.split(',').filter(Boolean) ?? []) as AccommodationTag[];
  const freeOnly = params.get('free') === '1';
  const selectedEventId = params.get('event');
  const hasFilters = !!q || categories.length > 0 || tags.length > 0 || freeOnly;

  const [events, setEvents] = useState<RankedEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [searchText, setSearchText] = useState(q);
  const [showMoreFilters, setShowMoreFilters] = useState(tags.length > 0 || freeOnly);

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
    // NOTE: keyed on the filter values, not `params`, so opening the
    // ?event= slide-over doesn't re-fetch the feed underneath it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, q, categories.join(','), tags.join(','), freeOnly, attempt]);

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next);
  }

  function toggleListParam(key: 'categories' | 'tags', value: string) {
    updateParams((p) => {
      const list = p.get(key)?.split(',').filter(Boolean) ?? [];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      if (next.length) p.set(key, next.join(',')); else p.delete(key);
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const text = searchText.trim();
    updateParams((p) => { if (text) p.set('q', text); else p.delete('q'); });
  }

  function clearFilters() {
    setSearchText('');
    setParams(new URLSearchParams());
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-1">Discover events</h1>
        <p className="m-0 text-muted text-lg">Kitchener–Waterloo · best fit for you first</p>
      </div>

      <form onSubmit={submitSearch} role="search" className="flex gap-2 max-w-xl">
        <label htmlFor="feed-search" className="sr-only">Search events in your own words</label>
        <input
          id="feed-search"
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder='Search — try "something quiet"'
          className="flex-1 min-h-[44px] px-5 rounded-full border border-black/10 bg-white"
        />
        <Button type="submit" variant="secondary" className="rounded-full">Search</Button>
      </form>

      <div role="group" aria-label="Filter by category" className="flex gap-2 flex-wrap items-center">
        {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => {
          const Icon = CATEGORY_ICONS[c];
          return (
            <FilterPill key={c} selected={categories.includes(c)} onClick={() => toggleListParam('categories', c)}>
              <Icon className="w-4 h-4" aria-hidden /> {CATEGORY_LABELS[c]}
            </FilterPill>
          );
        })}
        <Button
          variant="ghost"
          aria-expanded={showMoreFilters}
          onClick={() => setShowMoreFilters((s) => !s)}
          className="rounded-full border border-black/10 text-sm"
        >
          Comfort & cost {showMoreFilters
            ? <ChevronUp className="w-4 h-4" aria-hidden />
            : <ChevronDown className="w-4 h-4" aria-hidden />}
        </Button>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="rounded-full text-sm text-muted">
            Clear all
          </Button>
        )}
      </div>

      {showMoreFilters && (
        <div role="group" aria-label="Filter by comfort needs and cost" className="flex gap-2 flex-wrap rounded-2xl bg-black/[0.03] p-4">
          {(Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[]).map((t) => (
            <FilterPill key={t} selected={tags.includes(t)} onClick={() => toggleListParam('tags', t)}>
              {ACCOMMODATION_LABELS[t]}
            </FilterPill>
          ))}
          <FilterPill
            selected={freeOnly}
            onClick={() => updateParams((p) => { if (freeOnly) p.delete('free'); else p.set('free', '1'); })}
          >
            Free only
          </FilterPill>
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
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
          {events.map((ev) => (
            <li key={ev.id}>
              <EventCard ev={ev} onOpen={() => updateParams((p) => p.set('event', ev.id))} />
            </li>
          ))}
        </ul>
      )}

      {selectedEventId && (
        <EventDetailPanel
          eventId={selectedEventId}
          onClose={() => updateParams((p) => p.delete('event'))}
        />
      )}
    </div>
  );
}

function FilterPill({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'secondary' : 'ghost'}
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full text-sm ${selected ? 'border border-brand' : 'border border-black/10 bg-white'}`}
    >
      {selected && <Check className="w-4 h-4" aria-hidden />}
      {children}
    </Button>
  );
}

function EventCard({ ev, onOpen }: { ev: RankedEvent; onOpen: () => void }) {
  const { speak, stop, speaking } = useReadAloud();
  useEffect(() => stop, [stop]); // don't keep talking after the card unmounts
  const oneLiner = ev.plain_language_description ?? ev.description;

  return (
    <Card aria-labelledby={`ev-${ev.id}-title`} className="p-4 rounded-2xl h-full">
      <div className="flex gap-4 items-start">
        <EventCover category={ev.category} className="w-20 h-20 text-3xl" />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="m-0 text-sm text-muted flex items-center gap-1.5 flex-wrap">
            <span>{formatEventDate(ev.date_start, ev.date_end)}</span>
            <span aria-hidden>·</span>
            <span>{formatCost(ev.cost, ev.cost_amount)}</span>
            <DistanceBadge km={ev.distance_km} />
          </p>
          <h2 id={`ev-${ev.id}-title`} className="text-lg font-semibold leading-snug m-0">
            <Link
              to={`/events/${ev.id}`}
              onClick={(e) => {
                // plain click opens the slide-over; cmd/ctrl/middle-click
                // still opens the full page in a new tab
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onOpen();
              }}
              className="text-ink hover:text-brand-dark hover:underline"
            >
              {ev.title}
            </Link>
          </h2>
          <p className="m-0 text-sm text-muted">{ev.org_name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <AccessibilityBadge state={ev.accessibility_badge_state} />
            <Toggle
              pressed={speaking}
              label={speaking ? 'Stop' : 'Read aloud'}
              onToggle={() => (speaking ? stop() : speak(`${ev.title}. ${oneLiner}`))}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
