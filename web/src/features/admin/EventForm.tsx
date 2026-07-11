// Contributor 4 — the controlled create-event form. Used directly by
// FormCreatePage and reused by VoiceCreatePage as the editable review step
// (prefilled from the AI-extracted draft). Publishing goes through
// api.createEvent; if the plain-language field is left empty the server
// fills it via AiService.simplify.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { getCurrentOrgId } from '../../lib/session';
import { Button, Card, Field } from '../../components/ui';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type Event, type EventCategory,
} from '../../../../shared/models';
import type { ExtractedEvent } from '../../../../shared/contracts';

export interface EventDraft {
  title: string;
  description: string;
  plain_language: string;          // empty -> server auto-simplifies
  date_start: string;              // datetime-local value
  date_end: string;
  location_address: string;
  cost: 'free' | 'paid';
  cost_amount: string;
  category: EventCategory[];
  accommodation_tags: AccommodationTag[];
}

export const emptyDraft = (): EventDraft => ({
  title: '', description: '', plain_language: '', date_start: '', date_end: '',
  location_address: '', cost: 'free', cost_amount: '',
  category: [], accommodation_tags: [],
});

/** ISO -> <input type="datetime-local"> value in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** AI-extracted draft -> form draft (voice flow prefill). */
export function draftFromExtracted(x: ExtractedEvent): EventDraft {
  return {
    ...emptyDraft(),
    title: x.title,
    description: x.description,
    date_start: toLocalInput(x.date_start), // may be empty — staff fills it
    location_address: x.location_address ?? '',
    cost: x.cost,
    cost_amount: x.cost_amount != null ? String(x.cost_amount) : '',
    category: x.category,
    accommodation_tags: x.accommodation_tags,
  };
}

const inputCls = 'w-full min-h-[44px] rounded-lg border border-black/20 px-3 py-2 bg-white';

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

export function EventForm({ initial, createdVia, onCreated }: {
  initial?: Partial<EventDraft>;
  createdVia: 'form' | 'voice';
  onCreated: (event: Event) => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...emptyDraft(), ...initial }));
  const [errors, setErrors] = useState<Partial<Record<'title' | 'description' | 'date_start', string>>>({});
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setDraft((p) => ({ ...p, [k]: v }));
  const toggleIn = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function previewPlain() {
    if (!draft.description.trim()) return;
    setPreviewing(true);
    setApiError('');
    try {
      const { plain_language } = await api.simplify(draft.description);
      set('plain_language', plain_language);
    } catch {
      setApiError('Could not generate the plain-language preview. You can still publish — it will be generated on save.');
    } finally {
      setPreviewing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!draft.title.trim()) errs.title = 'Title is required.';
    if (!draft.description.trim()) errs.description = 'Description is required.';
    if (!draft.date_start) errs.date_start = 'A start date and time is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setApiError('');
    try {
      const created = await api.createEvent({
        org_id: getCurrentOrgId(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        plain_language_description: draft.plain_language.trim() || undefined,
        category: draft.category,
        accommodation_tags: draft.accommodation_tags,
        date_start: new Date(draft.date_start).toISOString(),
        date_end: draft.date_end ? new Date(draft.date_end).toISOString() : null,
        cost: draft.cost,
        cost_amount: draft.cost === 'paid' ? Number(draft.cost_amount) || 0 : null,
        location_address: draft.location_address.trim() || null,
        created_via: createdVia,
      });
      onCreated(created);
    } catch (err: any) {
      setApiError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Title" htmlFor="ef-title" error={errors.title}>
        <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <Field label="Description" htmlFor="ef-desc" error={errors.description}>
        <textarea className={`${inputCls} min-h-[96px]`} value={draft.description}
          onChange={(e) => set('description', e.target.value)} required />
      </Field>

      <div className="mb-4">
        <Button type="button" variant="secondary" onClick={previewPlain}
          loading={previewing} disabled={!draft.description.trim()}>
          Preview plain-language version
        </Button>
      </div>
      <Field
        label="Plain-language description" htmlFor="ef-plain"
        hint="What seekers with plain-language needs see. Leave empty to generate it automatically on publish; edit freely after previewing."
      >
        <textarea className={`${inputCls} min-h-[72px]`} value={draft.plain_language}
          onChange={(e) => set('plain_language', e.target.value)} />
      </Field>

      <div className="grid sm:grid-cols-2 sm:gap-3">
        <Field label="Starts" htmlFor="ef-start" error={errors.date_start}>
          <input type="datetime-local" className={inputCls} value={draft.date_start}
            onChange={(e) => set('date_start', e.target.value)} required />
        </Field>
        <Field label="Ends (optional)" htmlFor="ef-end">
          <input type="datetime-local" className={inputCls} value={draft.date_end}
            onChange={(e) => set('date_end', e.target.value)} />
        </Field>
      </div>
      <Field label="Location" htmlFor="ef-loc" hint="Street address or venue name.">
        <input className={inputCls} value={draft.location_address}
          onChange={(e) => set('location_address', e.target.value)} />
      </Field>

      <fieldset className="mb-4">
        <legend className="font-medium mb-1">Cost</legend>
        <div className="flex items-center gap-4">
          {(['free', 'paid'] as const).map((c) => (
            <label key={c} className="inline-flex items-center gap-2 min-h-[44px]">
              <input type="radio" name="ef-cost" checked={draft.cost === c} onChange={() => set('cost', c)} />
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
      <Button type="submit" loading={busy}>Publish event</Button>
    </form>
  );
}

/** Success state shared by the form and voice flows. */
export function PublishedCard({ event, onReset }: { event: Event; onReset: () => void }) {
  return (
    <Card role="status">
      <h2 className="font-bold text-brand-dark text-lg">✓ Event published</h2>
      <p className="mt-1">
        <strong>{event.title}</strong> is live and already appears in the Discover feed
        {event.plain_language_description ? ' with a plain-language description' : ''}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/events/${event.id}`}
          className="inline-flex items-center min-h-[44px] px-4 rounded-lg font-medium bg-brand text-white hover:bg-brand-dark">
          View event page →
        </Link>
        <Button type="button" variant="secondary" onClick={onReset}>Post another</Button>
      </div>
    </Card>
  );
}
