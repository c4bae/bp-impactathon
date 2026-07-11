// Event detail + create/edit modal for the calendar. View mode shows the
// event with Edit / full-page links; form mode drives api.createEvent /
// api.updateEvent / api.deleteEvent. Plain-language text is generated
// server-side (AiService.simplify) on create and on description edits.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { getCurrentOrgId } from '../../lib/session';
import { AccessibilityBadge, Button, Field, TagChip } from '../../components/ui';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type EventCategory, type RankedEvent,
} from '../../../../shared/models';
import { fmtDayLong, fmtTime, fromLocalInput, toLocalInput } from './calendarUtils';

export type CalendarModal =
  | { kind: 'view'; event: RankedEvent }
  | { kind: 'edit'; event: RankedEvent }
  | { kind: 'create'; date: Date };

const inputCls = 'w-full min-h-[44px] rounded-lg border border-black/20 px-3 py-2 bg-white';

// ---- modal shell (backdrop, esc, focus) -------------------------------
function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-modal-title"
        tabIndex={-1}
        className="w-full max-w-lg my-8 rounded-xl bg-white p-5 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="cal-modal-title" className="text-lg font-bold text-brand-dark">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="h-9 w-9 rounded-lg text-muted hover:bg-brand-light shrink-0">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- detail (view) mode -----------------------------------------------
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-20 shrink-0 font-medium text-muted">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

function EventDetails({ event, canManage, onEdit, onClose }: {
  event: RankedEvent; canManage: boolean; onEdit: () => void; onClose: () => void;
}) {
  const start = new Date(event.date_start);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AccessibilityBadge state={event.accessibility_badge_state} />
        <span className="text-sm text-muted">{event.org_name}</span>
      </div>
      <dl className="space-y-2">
        <DetailRow label="When">
          {fmtDayLong(start)}, {fmtTime(event.date_start)}
          {event.date_end ? ` – ${fmtTime(event.date_end)}` : ''}
        </DetailRow>
        <DetailRow label="Where">{event.location_address || 'Location to be announced'}</DetailRow>
        <DetailRow label="Cost">
          {event.cost === 'free' ? 'Free' : `$${Number(event.cost_amount ?? 0).toFixed(2)}`}
        </DetailRow>
        <DetailRow label="Category">
          {event.category.map((c) => CATEGORY_LABELS[c]).join(', ') || '—'}
        </DetailRow>
      </dl>
      {event.accommodation_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.accommodation_tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}
      <p className="text-sm rounded-lg bg-brand-light/60 p-3">
        {event.plain_language_description || event.description}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {canManage && <Button type="button" onClick={onEdit}>Edit event</Button>}
        <Link
          to={`/events/${event.id}`}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg font-medium bg-brand-light text-brand-dark hover:bg-[#d6e9e2]"
        >
          Full page →
        </Link>
        <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// ---- create / edit form -------------------------------------------------
interface Draft {
  title: string; description: string;
  date_start: string; date_end: string;     // datetime-local values
  location_address: string;
  cost: 'free' | 'paid'; cost_amount: string;
  category: EventCategory[]; accommodation_tags: AccommodationTag[];
}

function draftFrom(event: RankedEvent | null, date: Date | null): Draft {
  if (event) {
    return {
      title: event.title,
      description: event.description,
      date_start: toLocalInput(event.date_start),
      date_end: toLocalInput(event.date_end),
      location_address: event.location_address ?? '',
      cost: event.cost,
      cost_amount: event.cost_amount != null ? String(event.cost_amount) : '',
      category: event.category,
      accommodation_tags: event.accommodation_tags,
    };
  }
  const d = new Date(date ?? new Date());
  d.setHours(10, 0, 0, 0); // sensible default start time
  return {
    title: '', description: '', date_start: toLocalInput(d), date_end: '',
    location_address: '', cost: 'free', cost_amount: '',
    category: [], accommodation_tags: [],
  };
}

function ChipToggle({ label, pressed, onToggle }: {
  label: string; pressed: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`min-h-[36px] rounded-full border px-3 py-1 text-sm ${
        pressed ? 'border-brand bg-brand-light text-brand-dark font-medium' : 'border-black/20 text-muted hover:bg-brand-light/50'
      }`}
    >
      {pressed ? '✓ ' : ''}{label}
    </button>
  );
}

function EventForm({ event, date, onSaved, onClose }: {
  event: RankedEvent | null;      // null = create
  date: Date | null;              // default date for create
  onSaved: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(event, date));
  const [errors, setErrors] = useState<Partial<Record<'title' | 'description' | 'date_start', string>>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }));
  const toggleIn = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!draft.title.trim()) errs.title = 'Title is required.';
    if (!draft.description.trim()) errs.description = 'Description is required.';
    if (!draft.date_start) errs.date_start = 'A start date and time is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      accommodation_tags: draft.accommodation_tags,
      date_start: fromLocalInput(draft.date_start),
      date_end: draft.date_end ? fromLocalInput(draft.date_end) : null,
      cost: draft.cost,
      cost_amount: draft.cost === 'paid' ? Number(draft.cost_amount) || 0 : null,
      location_address: draft.location_address.trim() || null,
    };
    setBusy(true);
    setApiError('');
    try {
      if (event) await api.updateEvent(event.id, body);
      else await api.createEvent({ ...body, org_id: getCurrentOrgId(), created_via: 'form' });
      onSaved();
    } catch (err: any) {
      setApiError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!event) return;
    if (!window.confirm(`Delete "${event.title}"? This also removes its signups.`)) return;
    setBusy(true);
    try {
      await api.deleteEvent(event.id);
      onSaved();
    } catch (err: any) {
      setApiError(err?.message || 'Could not delete the event.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Title" htmlFor="ev-title" error={errors.title}>
        <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <Field
        label="Description" htmlFor="ev-desc" error={errors.description}
        hint="A plain-language version is generated automatically when you save."
      >
        <textarea className={`${inputCls} min-h-[96px]`} value={draft.description}
          onChange={(e) => set('description', e.target.value)} required />
      </Field>
      <div className="grid sm:grid-cols-2 sm:gap-3">
        <Field label="Starts" htmlFor="ev-start" error={errors.date_start}>
          <input type="datetime-local" className={inputCls} value={draft.date_start}
            onChange={(e) => set('date_start', e.target.value)} required />
        </Field>
        <Field label="Ends (optional)" htmlFor="ev-end">
          <input type="datetime-local" className={inputCls} value={draft.date_end}
            onChange={(e) => set('date_end', e.target.value)} />
        </Field>
      </div>
      <Field label="Location" htmlFor="ev-loc" hint="Street address or venue name.">
        <input className={inputCls} value={draft.location_address}
          onChange={(e) => set('location_address', e.target.value)} />
      </Field>

      <fieldset className="mb-4">
        <legend className="font-medium mb-1">Cost</legend>
        <div className="flex items-center gap-4">
          {(['free', 'paid'] as const).map((c) => (
            <label key={c} className="inline-flex items-center gap-2 min-h-[44px]">
              <input type="radio" name="ev-cost" checked={draft.cost === c} onChange={() => set('cost', c)} />
              {c === 'free' ? 'Free' : 'Paid'}
            </label>
          ))}
          {draft.cost === 'paid' && (
            <label className="inline-flex items-center gap-1">
              <span aria-hidden>$</span>
              <span className="sr-only">Amount in dollars</span>
              <input type="number" min="0" step="0.01" className={`${inputCls} w-24`}
                value={draft.cost_amount} onChange={(e) => set('cost_amount', e.target.value)} />
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="font-medium mb-1">Categories</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => (
            <ChipToggle key={c} label={CATEGORY_LABELS[c]} pressed={draft.category.includes(c)}
              onToggle={() => set('category', toggleIn(draft.category, c))} />
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="font-medium mb-1">Accessibility &amp; accommodations</legend>
        <p className="text-sm text-muted mb-1">What this event provides — functional supports, never diagnoses.</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[]).map((t) => (
            <ChipToggle key={t} label={ACCOMMODATION_LABELS[t]} pressed={draft.accommodation_tags.includes(t)}
              onToggle={() => set('accommodation_tags', toggleIn(draft.accommodation_tags, t))} />
          ))}
        </div>
      </fieldset>

      {apiError && <p role="alert" className="text-badge-gap text-sm mb-3">{apiError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={busy}>{event ? 'Save changes' : 'Add event'}</Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        {event && (
          <button type="button" onClick={remove} disabled={busy}
            className="ml-auto min-h-[44px] px-3 rounded-lg text-sm font-medium text-badge-gap hover:bg-orange-50 disabled:opacity-50">
            Delete event
          </button>
        )}
      </div>
    </form>
  );
}

// ---- entry point --------------------------------------------------------
export function EventModal({ modal, canManage = false, onClose, onChanged, onEdit }: {
  modal: CalendarModal;
  /** Org view only — create/edit/delete. Seekers get read-only details. */
  canManage?: boolean;
  onClose: () => void;
  /** called after create/edit/delete so the calendar refetches */
  onChanged: () => void;
  /** view mode -> edit mode */
  onEdit: (e: RankedEvent) => void;
}) {
  // Seekers should never land in create/edit; fall back to view when possible.
  const effective =
    !canManage && modal.kind !== 'view'
      ? (modal.kind === 'edit' ? { kind: 'view' as const, event: modal.event } : null)
      : modal;
  if (!effective) return null;

  const title =
    effective.kind === 'view' ? effective.event.title
    : effective.kind === 'edit' ? 'Edit event'
    : 'Add event';
  return (
    <ModalShell title={title} onClose={onClose}>
      {effective.kind === 'view' ? (
        <EventDetails
          event={effective.event}
          canManage={canManage}
          onEdit={() => onEdit(effective.event)}
          onClose={onClose}
        />
      ) : (
        <EventForm
          event={effective.kind === 'edit' ? effective.event : null}
          date={effective.kind === 'create' ? effective.date : null}
          onSaved={onChanged}
          onClose={onClose}
        />
      )}
    </ModalShell>
  );
}
