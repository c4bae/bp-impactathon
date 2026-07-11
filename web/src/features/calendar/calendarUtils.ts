// Date math + display helpers for the calendar feature. No date library —
// demo data is tiny and local-time-only, so hand-rolled helpers keep the
// bundle lean. All grouping is by the event's LOCAL start day.
import type { EventCategory, RankedEvent } from '../../../../shared/models';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Sunday-start week, matching the reference calendar. */
export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -d.getDay());
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 6x7 grid of days covering the month that contains `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Events keyed by local start day, each day's list sorted by start time. */
export function eventsByDay(events: RankedEvent[]): Map<string, RankedEvent[]> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
  );
  const map = new Map<string, RankedEvent[]>();
  for (const e of sorted) {
    const k = dayKey(new Date(e.date_start));
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  }
  return map;
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function fmtDayLong(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
}

export function fmtMonthYear(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d);
}

export function fmtWeekRange(d: Date): string {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  const md = (x: Date) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(x);
  const endPart = start.getMonth() === end.getMonth() ? String(end.getDate()) : md(end);
  return `${md(start)} – ${endPart}, ${end.getFullYear()}`;
}

/** ISO (or Date) -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(v: string | Date | null | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** datetime-local value -> ISO string (interpreted as local time). */
export function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

// One color per category; chips always carry text too (never color-only).
// Full class strings so Tailwind's scanner picks them up.
export const CATEGORY_COLORS: Record<EventCategory, { chip: string; dot: string }> = {
  arts:       { chip: 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-950', dot: 'bg-fuchsia-500' },
  sports:     { chip: 'bg-blue-100 border-blue-500 text-blue-950',          dot: 'bg-blue-500' },
  education:  { chip: 'bg-indigo-100 border-indigo-500 text-indigo-950',    dot: 'bg-indigo-500' },
  social:     { chip: 'bg-teal-100 border-teal-600 text-teal-950',          dot: 'bg-teal-600' },
  health:     { chip: 'bg-rose-100 border-rose-500 text-rose-950',          dot: 'bg-rose-500' },
  employment: { chip: 'bg-amber-100 border-amber-500 text-amber-950',       dot: 'bg-amber-500' },
  family:     { chip: 'bg-purple-100 border-purple-500 text-purple-950',    dot: 'bg-purple-500' },
  food:       { chip: 'bg-orange-100 border-orange-500 text-orange-950',    dot: 'bg-orange-500' },
  outdoors:   { chip: 'bg-green-100 border-green-600 text-green-950',       dot: 'bg-green-600' },
  tech:       { chip: 'bg-sky-100 border-sky-500 text-sky-950',             dot: 'bg-sky-500' },
};

/** Primary category drives the chip color; events without one read as social. */
export function eventColor(e: RankedEvent) {
  return CATEGORY_COLORS[e.category[0] ?? 'social'];
}
