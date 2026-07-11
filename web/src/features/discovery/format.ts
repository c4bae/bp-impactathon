// Contributor 1 — shared display formatting for the discovery screens.
import type { CostType } from '../../../../shared/models';

const dateFmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' });

/** "Sat, Jul 18 · 2:00 p.m." (adds "–4:00 p.m." when the end is the same day). */
export function formatEventDate(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso);
  let out = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (endIso) {
    const end = new Date(endIso);
    out += start.toDateString() === end.toDateString()
      ? `–${timeFmt.format(end)}`
      : ` to ${dateFmt.format(end)} ${timeFmt.format(end)}`;
  }
  return out;
}

export function formatCost(cost: CostType, amount: number | null): string {
  if (cost === 'free') return 'Free';
  return amount != null ? `$${amount}` : 'Paid';
}

const longDateFmt = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

/** "Saturday, July 18" — for the detail page hero. */
export function formatLongDate(iso: string): string {
  return longDateFmt.format(new Date(iso));
}

/** "2:00 p.m. – 4:00 p.m." */
export function formatTimeRange(startIso: string, endIso?: string | null): string {
  let out = timeFmt.format(new Date(startIso));
  if (endIso) out += ` – ${timeFmt.format(new Date(endIso))}`;
  return out;
}
