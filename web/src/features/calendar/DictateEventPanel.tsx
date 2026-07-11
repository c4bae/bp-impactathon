// Live voice dictation for calendar events. The mic records in 2.5s chunks;
// each chunk re-transcribes the WHOLE recording so far (ElevenLabs Scribe),
// and every transcript change re-extracts structured fields (OpenRouter).
// Fields fill in and flash as you speak, the parent calendar jumps to the
// extracted time slot with a ghost chip, and "Done" hands you an editable
// review to confirm before anything is published.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { getCurrentOrgId } from '../../lib/session';
import { useReadAloud } from '../../hooks/useReadAloud';
import { Button, Field } from '../../components/ui';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type Event, type EventCategory,
} from '../../../../shared/models';
import type { ExtractedEvent } from '../../../../shared/contracts';
import { fromLocalInput, toLocalInput } from './calendarUtils';

export interface DictationDraft {
  title: string; description: string;
  date_start: string; date_end: string;   // datetime-local values
  location_address: string;
  cost: 'free' | 'paid'; cost_amount: string;
  category: EventCategory[]; accommodation_tags: AccommodationTag[];
}

export const emptyDictation = (): DictationDraft => ({
  title: '', description: '', date_start: '', date_end: '',
  location_address: '', cost: 'free', cost_amount: '',
  category: [], accommodation_tags: [],
});

type Phase = 'starting' | 'listening' | 'finalizing' | 'review';
const CHUNK_MS = 2500;

const inputCls = 'w-full min-h-[44px] rounded-lg border border-black/20 px-3 py-2 bg-white';

export function DictateEventPanel({ onClose, onPublished, onDraftChange }: {
  onClose: () => void;
  onPublished: (e: Event) => void;
  /** streamed to the parent so the calendar can show the live ghost chip */
  onDraftChange: (d: DictationDraft) => void;
}) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<DictationDraft>(emptyDictation);
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const { speak, stop: stopSpeaking, speaking } = useReadAloud();

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sttBusy = useRef(false);
  const sttDirty = useRef(false);
  const extractBusy = useRef(false);
  const extractPending = useRef<string | null>(null);
  const lastTranscript = useRef('');
  const touched = useRef<Set<string>>(new Set());
  const closedRef = useRef(false);
  const finalizingRef = useRef(false);

  useEffect(() => { onDraftChange(draft); }, [draft, onDraftChange]);

  const triggerFlash = (keys: string[]) => {
    setFlash((p) => ({ ...p, ...Object.fromEntries(keys.map((k) => [k, true])) }));
    setTimeout(() => setFlash((p) => {
      const next = { ...p };
      for (const k of keys) delete next[k];
      return next;
    }), 1400);
  };

  const applyExtracted = useCallback((x: ExtractedEvent) => {
    setDraft((prev) => {
      const next = { ...prev };
      const flashes: string[] = [];
      const maybe = <K extends keyof DictationDraft>(key: K, value: DictationDraft[K] | null) => {
        if (touched.current.has(key)) return;                      // never clobber user edits
        if (value == null || value === '') return;                 // partial dictation: don't clear
        if (Array.isArray(value) && value.length === 0) return;
        if (JSON.stringify(next[key]) !== JSON.stringify(value)) {
          next[key] = value;
          flashes.push(key);
        }
      };
      maybe('title', x.title || null);
      maybe('description', x.description || null);
      maybe('date_start', x.date_start ? toLocalInput(x.date_start) : null);
      maybe('location_address', x.location_address);
      maybe('category', x.category);
      maybe('accommodation_tags', x.accommodation_tags);
      if (x.cost === 'paid') {
        maybe('cost', 'paid');
        maybe('cost_amount', x.cost_amount != null ? String(x.cost_amount) : null);
      }
      if (flashes.length) triggerFlash(flashes);
      return next;
    });
  }, []);

  const runExtract = useCallback(async (text: string) => {
    if (extractBusy.current) { extractPending.current = text; return; }
    extractBusy.current = true;
    try {
      const extracted = await api.extractEvent(text);
      // once finalizing, only the forced final extract may apply results
      if (!finalizingRef.current && !closedRef.current) applyExtracted(extracted);
    } catch { /* transient — next transcript retries */ }
    extractBusy.current = false;
    if (extractPending.current && !closedRef.current && !finalizingRef.current) {
      const pending = extractPending.current;
      extractPending.current = null;
      runExtract(pending);
    }
  }, [applyExtracted]);

  const transcribeAll = useCallback(async () => {
    if (finalizingRef.current || closedRef.current) return;
    if (sttBusy.current) { sttDirty.current = true; return; }
    if (!chunksRef.current.length) return;
    sttBusy.current = true;
    sttDirty.current = false;
    try {
      const blob = new Blob(chunksRef.current, { type: recRef.current?.mimeType || 'audio/webm' });
      const text = (await api.stt(blob)).trim();
      if (!closedRef.current && text && text !== lastTranscript.current) {
        lastTranscript.current = text;
        setTranscript(text);
        runExtract(text);
      }
    } catch {
      setError('Transcription hiccup — still listening. You can also type into the fields directly.');
    }
    sttBusy.current = false;
    if (sttDirty.current && !closedRef.current) transcribeAll();
  }, [runExtract]);

  // start the mic as soon as the panel opens
  useEffect(() => {
    let cancelled = false;
    closedRef.current = false; // reset: StrictMode runs cleanup once on mount
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const rec = new MediaRecorder(
          stream,
          MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined,
        );
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) { chunksRef.current.push(e.data); transcribeAll(); }
        };
        rec.onstop = async () => {
          // Halt the rolling loop, then do ONE final pass over the complete
          // recording so the review deterministically shows the finished
          // draft — no straggler extract can rewrite fields afterwards.
          finalizingRef.current = true;
          const deadline = Date.now() + 15_000;
          while (Date.now() < deadline && sttBusy.current) {
            await new Promise((r) => setTimeout(r, 150));
          }
          try {
            if (chunksRef.current.length && !closedRef.current) {
              const blob = new Blob(chunksRef.current, { type: recRef.current?.mimeType || 'audio/webm' });
              const text = (await api.stt(blob)).trim();
              if (text && !closedRef.current) {
                lastTranscript.current = text;
                setTranscript(text);
                applyExtracted(await api.extractEvent(text));
              }
            }
          } catch { /* keep whatever the live loop already filled in */ }
          if (!closedRef.current) setPhase('review');
        };
        recRef.current = rec;
        rec.start(CHUNK_MS);
        setPhase('listening');
      } catch {
        setError('Could not access a microphone. You can type the details below, or use the form page.');
        setPhase('review');
      }
    })();
    return () => {
      cancelled = true;
      closedRef.current = true;
      recRef.current?.state !== 'inactive' && recRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishListening() {
    setPhase('finalizing');
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    else setPhase('review');
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  const set = <K extends keyof DictationDraft>(k: K, v: DictationDraft[K]) => {
    touched.current.add(k);
    setDraft((p) => ({ ...p, [k]: v }));
  };
  const toggleIn = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function publish() {
    const description = draft.description.trim() || transcript.trim();
    if (!draft.title.trim() || !description || !draft.date_start) {
      setError('A title, description, and start time are needed before publishing.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const created = await api.createEvent({
        org_id: getCurrentOrgId(),
        title: draft.title.trim(),
        description,
        category: draft.category,
        accommodation_tags: draft.accommodation_tags,
        date_start: fromLocalInput(draft.date_start),
        date_end: draft.date_end ? fromLocalInput(draft.date_end) : null,
        cost: draft.cost,
        cost_amount: draft.cost === 'paid' ? Number(draft.cost_amount) || 0 : null,
        location_address: draft.location_address.trim() || null,
        created_via: 'voice',
      });
      onPublished(created);
    } catch (err: any) {
      setError(err?.message || 'Publishing failed. Please try again.');
      setPublishing(false);
    }
  }

  const ring = (k: string) => (flash[k] ? 'ring-2 ring-brand rounded-lg transition-shadow' : 'transition-shadow');
  const listening = phase === 'listening';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Dictate a calendar event"
      className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white border-l border-black/10 shadow-2xl flex flex-col"
    >
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-lg font-bold text-brand-dark">
            {listening || phase === 'starting' ? '🎙 Dictate your event' : phase === 'finalizing' ? 'Wrapping up…' : 'Confirm your event'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cancel dictation and close"
            className="h-9 w-9 rounded-lg text-muted hover:bg-brand-light shrink-0">✕</button>
        </div>

        {(listening || phase === 'starting' || phase === 'finalizing') && (
          <p role="status" className="inline-flex items-center gap-2 font-medium text-badge-gap mb-2">
            <span aria-hidden className={`h-3 w-3 rounded-full bg-red-600 ${listening ? 'animate-pulse' : ''}`} />
            {phase === 'starting' ? 'Starting microphone…'
              : listening ? 'Listening — just describe the event'
              : 'Finishing transcription…'}
          </p>
        )}
        {phase === 'review' && !error && (
          <p className="text-muted text-sm mb-2">Check everything below — edit anything, then publish.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2">
      {transcript && (
        <p aria-live="polite" className="text-sm text-muted italic bg-gray-50 rounded-lg p-3 mb-4 max-h-28 overflow-y-auto">
          “{transcript}”
        </p>
      )}
      {error && <p role="alert" className="text-badge-gap text-sm mb-3">{error}</p>}

      <div className={ring('title')}>
        <Field label="Title" htmlFor="dic-title">
          <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
      </div>
      <div className={ring('date_start')}>
        <Field label="Starts" htmlFor="dic-start">
          <input type="datetime-local" className={inputCls} value={draft.date_start}
            onChange={(e) => set('date_start', e.target.value)} />
        </Field>
      </div>
      <div className={ring('location_address')}>
        <Field label="Location" htmlFor="dic-loc">
          <input className={inputCls} value={draft.location_address}
            onChange={(e) => set('location_address', e.target.value)} />
        </Field>
      </div>
      <div className={ring('description')}>
        <Field label="Description" htmlFor="dic-desc">
          <textarea className={`${inputCls} min-h-[72px]`} value={draft.description}
            onChange={(e) => set('description', e.target.value)} />
        </Field>
      </div>

      <fieldset className={`mb-4 ${ring('cost')}`}>
        <legend className="font-medium mb-1">Cost</legend>
        <div className="flex items-center gap-4">
          {(['free', 'paid'] as const).map((c) => (
            <label key={c} className="inline-flex items-center gap-2 min-h-[44px]">
              <input type="radio" name="dic-cost" checked={draft.cost === c} onChange={() => set('cost', c)} />
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

      <fieldset className={`mb-4 ${ring('category')}`}>
        <legend className="font-medium mb-1">Categories</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => (
            <button key={c} type="button" aria-pressed={draft.category.includes(c)}
              onClick={() => set('category', toggleIn(draft.category, c))}
              className={`min-h-[36px] rounded-full border px-3 py-1 text-sm ${
                draft.category.includes(c) ? 'border-brand bg-brand-light text-brand-dark font-medium' : 'border-black/20 text-muted'
              }`}>
              {draft.category.includes(c) ? '✓ ' : ''}{CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={`mb-4 ${ring('accommodation_tags')}`}>
        <legend className="font-medium mb-1">Accessibility &amp; accommodations</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[]).map((t) => (
            <button key={t} type="button" aria-pressed={draft.accommodation_tags.includes(t)}
              onClick={() => set('accommodation_tags', toggleIn(draft.accommodation_tags, t))}
              className={`min-h-[36px] rounded-full border px-3 py-1 text-sm ${
                draft.accommodation_tags.includes(t) ? 'border-brand bg-brand-light text-brand-dark font-medium' : 'border-black/20 text-muted'
              }`}>
              {draft.accommodation_tags.includes(t) ? '✓ ' : ''}{ACCOMMODATION_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>
      </div>

      <div className="p-4 border-t border-black/10 space-y-2">
        {listening && (
          <Button type="button" className="w-full" onClick={finishListening}>
            ✓ Done — review details
          </Button>
        )}
        {phase === 'review' && (
          <>
            <Button type="button" className="w-full" loading={publishing} onClick={publish}>
              Publish event
            </Button>
            <Button type="button" variant="secondary" className="w-full"
              onClick={() => (speaking
                ? stopSpeaking()
                : speak(`Please confirm: ${draft.title}. ${draft.date_start ? `Starting ${new Date(draft.date_start).toLocaleString()}.` : ''} ${draft.description}`))}>
              {speaking ? '◼ Stop reading' : '🔊 Read it back to me'}
            </Button>
          </>
        )}
        <p className="text-center text-sm text-muted">
          Prefer typing? <Link to="/admin/new/form" className="text-brand underline">Use the form</Link>
        </p>
      </div>
    </div>
  );
}
