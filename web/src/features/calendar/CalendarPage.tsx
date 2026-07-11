// Community calendar — decluttered take on the reference Teamup embed.
// Three views (Month / Week / List) instead of eleven; the category color
// legend doubles as the filter; add/edit/view all happen in one modal.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DictateEventPanel, type DictationDraft } from './DictateEventPanel';
import { DICTATION_PREVIEW_ID, ListView, MonthGrid, WeekView } from './views';

type View = 'month' | 'week' | 'list';
const VIEW_LABELS: Record<View, string> = { month: 'Month', week: 'Week', list: 'List' };

export function CalendarPage() {
  const { userId, view: demoView } = useSession();
  const isOrg = demoView === 'org';
  const [events, setEvents] = useState<RankedEvent[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [modal, setModal] = useState<CalendarModal | null>(null);
  const [dictating, setDictating] = useState(false);
  const [dictation, setDictation] = useState<DictationDraft | null>(null);
  const lastJumpDate = useRef('');

  // Drop create/edit/dictate if the demo view flips back to seeker.
  useEffect(() => {
    if (isOrg) return;
    setDictating(false);
    setDictation(null);
    lastJumpDate.current = '';
    setModal((m) => (m && m.kind !== 'view' ? null : m));
  }, [isOrg]);

  const load = useCallback(() => {
    setError('');
    api.feed({ user_id: userId })
      .then(setEvents)
      .catch(() => setError('Could not load events. Is the API running?'));
  }, [userId]);
  useEffect(load, [load]);

  const filtered = useMemo(
    () => (events ?? []).filter(
      (e) => !cats.length || e.category.some((c) => cats.includes(c)),
    ),
    [events, cats],
  );

  const eventDays = useMemo(
    () => new Set(filtered.map((e) => dayKey(new Date(e.date_start)))),
    [filtered],
  );

  // ---- live dictation: ghost chip + follow the extracted time slot ----
  const handleDictationDraft = useCallback((d: DictationDraft) => {
    setDictation(d);
    if (d.date_start && d.date_start !== lastJumpDate.current) {
      lastJumpDate.current = d.date_start;
      setCursor(new Date(d.date_start));
      setView('week'); // week view makes the time slot visible as it moves
    }
  }, []);

  const stopDictation = useCallback(() => {
    setDictating(false);
    setDictation(null);
    lastJumpDate.current = '';
  }, []);

  const previewEvent = useMemo<RankedEvent | null>(() => {
    if (!dictating || !dictation?.date_start) return null;
    return {
      id: DICTATION_PREVIEW_ID,
      org_id: '', org_name: '',
      title: dictation.title || 'New event…',
      description: '', plain_language_description: null,
      category: dictation.category,
      date_start: new Date(dictation.date_start).toISOString(),
      date_end: null,
      cost: dictation.cost, cost_amount: null, age_group: null,
      location_lat: null, location_lng: null,
      location_address: dictation.location_address || null,
      accommodation_tags: dictation.accommodation_tags,
      accessibility_badge_state: 'not_yet_verified',
      created_via: 'voice', created_at: '',
      distance_km: null, score: 0, score_reasons: [],
    };
  }, [dictating, dictation]);

  const viewEvents = useMemo(
    () => (previewEvent ? [...filtered, previewEvent] : filtered),
    [filtered, previewEvent],
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
  // While dictating, pad right so the panel doesn't cover the calendar.
  return (
    <div className={`relative left-1/2 -translate-x-1/2 w-[min(100vw-2rem,72rem)] ${dictating ? 'xl:pr-[29rem]' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Community calendar</h1>
          <p className="text-muted text-sm">Inclusive, accessible events across Waterloo Region.</p>
        </div>
        {isOrg && (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={dictating}
              onClick={() => { setModal(null); setDictating(true); }}>
              Dictate event
            </Button>
            <Button type="button" onClick={() => setModal({ kind: 'create', date: cursor })}>
              + Add event
            </Button>
          </div>
        )}
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
                events={viewEvents}
                onOpenEvent={openEvent}
                onDayClick={(d) => { setCursor(d); setView('week'); }}
              />
            ) : view === 'week' ? (
              <WeekView cursor={cursor} events={viewEvents} onOpenEvent={openEvent} />
            ) : (
              <ListView events={viewEvents} onOpenEvent={openEvent} />
            )
          )}
        </Card>
      </div>

      {modal && (
        <EventModal
          modal={modal}
          canManage={isOrg}
          onClose={() => setModal(null)}
          onChanged={() => { setModal(null); load(); }}
          onEdit={(e) => setModal({ kind: 'edit', event: e })}
        />
      )}

      {isOrg && dictating && (
        <DictateEventPanel
          onClose={stopDictation}
          onDraftChange={handleDictationDraft}
          onPublished={() => { stopDictation(); load(); }}
        />
      )}
    </div>
  );
}
