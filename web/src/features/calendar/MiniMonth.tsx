// Compact month picker in the sidebar — jump navigation, like the small
// calendar in the reference site. Days with events get a dot.
import { useEffect, useState } from 'react';
import {
  WEEKDAYS, dayKey, fmtDayLong, fmtMonthYear, monthGrid, sameDay,
} from './calendarUtils';

export function MiniMonth({
  cursor, eventDays, onSelect,
}: {
  cursor: Date;
  /** dayKey()s that have at least one event (post-filter) */
  eventDays: Set<string>;
  onSelect: (d: Date) => void;
}) {
  const [month, setMonth] = useState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  // follow the main calendar when it navigates
  useEffect(() => {
    setMonth(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  }, [cursor]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const today = new Date();

  return (
    <div aria-label="Jump to date">
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month"
          className="h-9 w-9 rounded-lg hover:bg-brand-light text-brand-dark">‹</button>
        <span className="font-medium text-sm">{fmtMonthYear(month)}</span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month"
          className="h-9 w-9 rounded-lg hover:bg-brand-light text-brand-dark">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted mb-0.5">
        {WEEKDAYS.map((w) => <div key={w} aria-hidden>{w[0]}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(month).map((d) => {
          const inMonth = d.getMonth() === month.getMonth();
          const selected = sameDay(d, cursor);
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={fmtDayLong(d)}
              aria-pressed={selected}
              className={`relative h-9 w-9 mx-auto rounded-full text-sm ${
                selected ? 'bg-brand text-white font-semibold'
                : isToday ? 'ring-1 ring-brand text-brand-dark font-semibold hover:bg-brand-light'
                : inMonth ? 'text-ink hover:bg-brand-light'
                : 'text-muted/50 hover:bg-brand-light'
              }`}
            >
              {d.getDate()}
              {eventDays.has(dayKey(d)) && (
                <span aria-hidden className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-brand'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
