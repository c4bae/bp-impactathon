// Community calendar — decluttered take on the reference Teamup embed.
// Three views (Month / Week / List) instead of eleven; the category color
// legend doubles as the filter; add/edit/view all happen in one modal.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { Button, Card, Spinner } from '../../components/ui';
import {
  CATEGORY_LABELS, type EventCategory, type RankedEvent,
} from '../../../../shared/models';
import {
  CATEGORY_COLORS, addDays, dayKey, fmtMonthYear, fmtWeekRange,
} from './calendarUtils';
import { MiniMonth } from './MiniMonth';
import { EventModal, type CalendarModal } from './EventModal';
import { ListView, MonthGrid, WeekView } from './views';

type View = 'month' | 'week' | 'list';
const VIEW_LABELS: Record<View, string> = { month: 'Month', week: 'Week', list: 'List' };

export function CalendarPage() {
  const { userId } = useSession();
  const [events, setEvents] = useState<RankedEvent[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [modal, setModal] = useState<CalendarModal | null>(null);

  const load = useCallback(() => {
    setError('');
    api.feed({ user_id: userId })
      .then(setEvents)
      .catch(() => setError('Could not load events. Is the API running?'));
  }, [userId]);
  useEffect(load, [load]);

  const orgs = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events ?? []) m.set(e.org_id, e.org_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const filtered = useMemo(
    () => (events ?? []).filter(
      (e) =>
        (!cats.length || e.category.some((c) => cats.includes(c))) &&
        (!orgFilter || e.org_id === orgFilter),
    ),
    [events, cats, orgFilter],
  );

  const eventDays = useMemo(
    () => new Set(filtered.map((e) => dayKey(new Date(e.date_start)))),
    [filtered],
  );

  const navigate = (dir: 1 | -1) =>
    setCursor((c) => view === 'month'
      ? new Date(c.getFullYear(), c.getMonth() + dir, 1)
      : addDays(c, dir * 7));

  const rangeLabel =
    view === 'month' ? fmtMonthYear(cursor)
    : view === 'week' ? fmtWeekRange(cursor)
    : 'Upcoming events';

  const openEvent = (e: RankedEvent) => setModal({ kind: 'view', event: e });

  // Break out of the app shell's narrow column — a calendar needs width.
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[min(100vw-2rem,72rem)]">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Community calendar</h1>
          <p className="text-muted text-sm">Inclusive, accessible events across Waterloo Region.</p>
        </div>
        <Button type="button" onClick={() => setModal({ kind: 'create', date: cursor })}>
          + Add event
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr] items-start">
        {/* ---- sidebar ---- */}
        <div className="space-y-4">
          <Card className="hidden lg:block">
            <MiniMonth cursor={cursor} eventDays={eventDays} onSelect={setCursor} />
          </Card>
          <Card>
            <h2 className="font-semibold text-sm mb-2">Filter by category</h2>
            <div className="flex flex-wrap lg:flex-col gap-1" role="group" aria-label="Category filters">
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => {
                const active = cats.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCats((p) => (active ? p.filter((x) => x !== c) : [...p, c]))}
                    className={`flex items-center gap-2 min-h-[36px] rounded-lg px-2 text-sm text-left ${
                      active ? 'bg-brand-light font-medium text-brand-dark' : 'text-muted hover:bg-brand-light/50'
                    }`}
                  >
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[c].dot}`} />
                    {CATEGORY_LABELS[c]}
                    {active && <span aria-hidden className="ml-auto">✓</span>}
                  </button>
                );
              })}
            </div>
            {cats.length > 0 && (
              <button type="button" onClick={() => setCats([])}
                className="mt-2 text-sm text-brand-dark underline min-h-[36px]">
                Clear categories
              </button>
            )}
            <label className="block mt-3">
              <span className="font-semibold text-sm">Organization</span>
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-lg border border-black/20 bg-white px-2"
              >
                <option value="">All organizations</option>
                {orgs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </Card>
        </div>

        {/* ---- calendar ---- */}
        <Card>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button type="button" variant="secondary" onClick={() => setCursor(new Date())}>Today</Button>
            {view !== 'list' && (
              <>
                <button type="button" onClick={() => navigate(-1)} aria-label={`Previous ${view}`}
                  className="h-11 w-11 rounded-lg hover:bg-brand-light text-brand-dark text-lg">‹</button>
                <button type="button" onClick={() => navigate(1)} aria-label={`Next ${view}`}
                  className="h-11 w-11 rounded-lg hover:bg-brand-light text-brand-dark text-lg">›</button>
              </>
            )}
            <h2 className="font-bold text-lg mx-1" aria-live="polite">{rangeLabel}</h2>
            <div className="ml-auto flex rounded-lg border border-black/15 p-0.5" role="group" aria-label="Calendar view">
              {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`min-h-[40px] px-3 rounded-md text-sm ${
                    view === v ? 'bg-brand text-white font-medium' : 'text-muted hover:bg-brand-light'
                  }`}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-badge-gap py-6 text-center">
              {error}{' '}
              <button type="button" onClick={load} className="underline font-medium">Retry</button>
            </p>
          )}
          {!error && events === null && (
            <div className="flex justify-center py-16"><Spinner label="Loading events" /></div>
          )}
          {!error && events !== null && (
            view === 'month' ? (
              <MonthGrid
                cursor={cursor}
                events={filtered}
                onOpenEvent={openEvent}
                onDayClick={(d) => { setCursor(d); setView('week'); }}
              />
            ) : view === 'week' ? (
              <WeekView cursor={cursor} events={filtered} onOpenEvent={openEvent} />
            ) : (
              <ListView events={filtered} onOpenEvent={openEvent} />
            )
          )}
        </Card>
      </div>

      {modal && (
        <EventModal
          modal={modal}
          onClose={() => setModal(null)}
          onChanged={() => { setModal(null); load(); }}
          onEdit={(e) => setModal({ kind: 'edit', event: e })}
        />
      )}
    </div>
  );
}
