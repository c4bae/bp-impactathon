// Contributor 4 — Create event by voice: record → transcribe (ElevenLabs
// Scribe in live mode, canned in mock) → AI-structure → editable review
// (reuses EventForm) → publish. Demo safety nets: a "use sample transcript"
// button that skips the mic entirely, and a link to the type-it-out form.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useReadAloud } from '../../hooks/useReadAloud';
import { Button, Card } from '../../components/ui';
import type { Event } from '../../../../shared/models';
import { EventForm, PublishedCard, draftFromExtracted, type EventDraft } from './EventForm';

const SAMPLE_TRANSCRIPT =
  'Free sensory friendly art night this Friday at seven pm at the Victoria Park pavilion. ' +
  'Drop in any time. There is a quiet space and the pavilion is step free. Everyone is welcome.';

type Stage = 'capture' | 'review' | 'done';

export function VoiceCreatePage() {
  const [stage, setStage] = useState<Stage>('capture');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<'transcribing' | 'structuring' | null>(null);
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [dateMissing, setDateMissing] = useState(false);
  const [created, setCreated] = useState<Event | null>(null);
  const [error, setError] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const { speak, stop, speaking } = useReadAloud();

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined,
      );
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy('transcribing');
        try {
          const text = await api.stt(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          setTranscript(text);
        } catch {
          setError('Transcription failed. Try again, use the sample transcript, or type it out instead.');
        } finally {
          setBusy(null);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('Could not access a microphone. Use the sample transcript below, or type it out instead.');
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  async function structure(text: string) {
    setBusy('structuring');
    setError('');
    try {
      const extracted = await api.extractEvent(text);
      setDraft(draftFromExtracted(extracted));
      setDateMissing(!extracted.date_start);
      setStage('review');
    } catch {
      setError('Could not structure the transcript. You can try again or type it out instead.');
    } finally {
      setBusy(null);
    }
  }

  if (stage === 'done' && created) {
    return (
      <PublishedCard
        event={created}
        onReset={() => { setStage('capture'); setTranscript(''); setDraft(null); setCreated(null); }}
      />
    );
  }

  if (stage === 'review' && draft) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Check the details</h1>
          <p className="text-muted text-sm">
            We structured your recording — fix anything that's off before publishing.
          </p>
        </div>
        {dateMissing && (
          <p role="alert" className="rounded-lg bg-orange-100 text-badge-gap px-4 py-3">
            ⚠ We couldn't confirm a date from the recording, so we left it blank — please set it.
            We never guess dates.
          </p>
        )}
        <Button
          type="button" variant="secondary"
          onClick={() => (speaking ? stop() : speak(`Please confirm: ${draft.title}. ${draft.description}`))}
        >
          {speaking ? '◼ Stop reading' : '🔊 Read this back to me'}
        </Button>
        <EventForm
          initial={draft}
          createdVia="voice"
          onCreated={(e) => { setCreated(e); setStage('done'); }}
        />
        <p className="text-muted text-sm">
          Not quite right? <button type="button" onClick={() => setStage('capture')} className="text-brand underline">
            Go back to the transcript
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">Post an event by voice</h1>
        <p className="text-muted text-sm">
          Just say it — what, when, where, cost, and any accessibility supports. We'll structure
          it and you confirm before anything is published. Prefer typing?{' '}
          <Link to="/admin/new/form" className="text-brand underline">Use the form instead</Link>.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <Button type="button" onClick={startRecording} disabled={busy !== null}>
              🎙 Start recording
            </Button>
          ) : (
            <Button type="button" onClick={stopRecording}>◼ Stop recording</Button>
          )}
          <Button type="button" variant="secondary" disabled={recording || busy !== null}
            onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}>
            Skip recording — use a sample
          </Button>
          {recording && (
            <span role="status" className="inline-flex items-center gap-2 font-medium text-badge-gap">
              <span aria-hidden className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
              Recording… speak now, then press stop
            </span>
          )}
          {busy === 'transcribing' && <span role="status" className="text-muted">Transcribing…</span>}
        </div>
      </Card>

      {error && <p role="alert" className="text-badge-gap">{error}</p>}

      {transcript && (
        <Card>
          <label htmlFor="vc-transcript" className="block font-medium mb-1">Transcript</label>
          <p className="text-muted text-sm mb-1">Fix any mistakes before we structure it.</p>
          <textarea
            id="vc-transcript"
            className="w-full min-h-[96px] rounded-lg border border-black/20 px-3 py-2"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="mt-3">
            <Button type="button" loading={busy === 'structuring'} onClick={() => structure(transcript)}>
              Structure the details →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
