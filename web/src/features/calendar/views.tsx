// The three calendar views. Deliberately simpler than the reference site:
// week view stacks each day's events chronologically instead of an
// absolute-positioned time grid, so nothing overlaps or truncates to
// unreadable slivers.
import type { RankedEvent } from '../../../../shared/models';
import { AccessibilityBadge } from '../../components/ui';
import {
  WEEKDAYS, addDays, dayKey, eventColor, eventsByDay, fmtDayLong, fmtTime,
  monthGrid, sameDay, startOfDay, startOfWeek,
} from './calendarUtils';

export type OpenEvent = (e: RankedEvent) => void;

/** id of the synthetic "ghost" event shown while dictation is in progress */
export const DICTATION_PREVIEW_ID = '__dictation_preview__';

function EventChip({ event, onOpen }: { event: RankedEvent; onOpen: OpenEvent }) {
  if (event.id === DICTATION_PREVIEW_ID) {
    return (
      <span
        aria-live="polite"
        title={event.title}
        className="block w-full rounded border-2 border-dashed border-brand bg-brand-light text-brand-dark px-1.5 py-1 text-xs leading-tight font-medium animate-pulse"
      >
        <span aria-hidden>🎙 </span>
        <span className="font-semibold">{fmtTime(event.date_start)}</span>{' '}
        <span className="line-clamp-2">{event.title}</span>
      </span>
    );
  }
  const c = eventColor(event);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      title={event.title}
      className={`block w-full text-left rounded border-l-4 px-1.5 py-1 text-xs leading-tight hover:opacity-75 ${c.chip}`}
    >
      <span className="font-semibold">{fmtTime(event.date_start)}</span>{' '}
      <span className="line-clamp-2">{event.title}</span>
    </button>
  );
}

// ---- Month -----------------------------------------------------------
export function MonthGrid({
  cursor, events, onOpenEvent, onDayClick,
}: {
  cursor: Date;
  events: RankedEvent[];
  onOpenEvent: OpenEvent;
  /** e.g. jump to that day's week when "+N more" / the date is clicked */
  onDayClick: (d: Date) => void;
}) {
  const byDay = eventsByDay(events);
  const today = new Date();
  const MAX = 3;
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted border-b border-black/10 pb-1">
        {WEEKDAYS.map((w) => <div key={w} aria-hidden>{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(cursor).map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const list = byDay.get(dayKey(d)) ?? [];
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[6.5rem] border-b border-r border-black/10 p-1 space-y-1 first:border-l ${inMonth ? '' : 'bg-gray-50'}`}
            >
              <button
                type="button"
                onClick={() => onDayClick(d)}
                aria-label={fmtDayLong(d)}
                className={`block ml-auto h-7 w-7 rounded-full text-sm text-center leading-7 hover:bg-brand-light ${
                  isToday ? 'bg-brand text-white font-bold hover:bg-brand-dark' : inMonth ? 'text-ink' : 'text-muted/60'
                }`}
              >
                {d.getDate()}
              </button>
              {list.slice(0, MAX).map((e) => <EventChip key={e.id} event={e} onOpen={onOpenEvent} />)}
              {list.length > MAX && (
                <button
                  type="button"
                  onClick={() => onDayClick(d)}
                  className="block w-full text-left text-xs text-brand-dark font-medium px-1.5 hover:underline"
                >
                  +{list.length - MAX} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Week ------------------------------------------------------------
export function WeekView({
  cursor, events, onOpenEvent,
}: { cursor: Date; events: RankedEvent[]; onOpenEvent: OpenEvent }) {
  const byDay = eventsByDay(events);
  const start = startOfWeek(cursor);
  const today = new Date();
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
        const isToday = sameDay(d, today);
        const list = byDay.get(dayKey(d)) ?? [];
        return (
          <div key={d.toISOString()} className={`rounded-lg border p-1.5 ${isToday ? 'border-brand bg-brand-light/40' : 'border-black/10'}`}>
            <h3 className={`text-sm text-center mb-1.5 ${isToday ? 'font-bold text-brand-dark' : 'font-medium text-muted'}`}>
              {WEEKDAYS[d.getDay()]} <span className="tabular-nums">{d.getDate()}</span>
              {isToday && <span className="sr-only"> (today)</span>}
            </h3>
            <div className="space-y-1">
              {list.length
                ? list.map((e) => <EventChip key={e.id} event={e} onOpen={onOpenEvent} />)
                : <p className="text-xs text-muted/60 text-center py-2 md:py-6">No events</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- List (upcoming agenda) -------------------------------------------
export function ListView({
  events, onOpenEvent,
}: { events: RankedEvent[]; onOpenEvent: OpenEvent }) {
  const cutoff = startOfDay(new Date()).getTime();
  const upcoming = events.filter((e) => new Date(e.date_start).getTime() >= cutoff);
  const byDay = eventsByDay(upcoming);
  if (!byDay.size) {
    return <p className="text-muted text-center py-10">No upcoming events match your filters.</p>;
  }
  return (
    <div className="space-y-5">
      {[...byDay.entries()].map(([k, list]) => (
        <section key={k} aria-label={fmtDayLong(new Date(list[0].date_start))}>
          <h3 className="font-semibold text-brand-dark border-b border-black/10 pb-1 mb-1">
            {fmtDayLong(new Date(list[0].date_start))}
          </h3>
          <ul>
            {list.map((e) => {
              const c = eventColor(e);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(e)}
                    className="w-full min-h-[44px] flex items-center gap-3 text-left rounded-lg px-2 py-2 hover:bg-brand-light/50"
                  >
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.dot}`} />
                    <span className="text-sm text-muted tabular-nums w-20 shrink-0">{fmtTime(e.date_start)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{e.title}</span>
                      <span className="block text-sm text-muted truncate">{e.org_name}</span>
                    </span>
                    <AccessibilityBadge state={e.accessibility_badge_state} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
