// Contributor 4 — Create event by form: the reliable fallback path, and
// the same form component the voice flow reuses as its review step.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../../../shared/models';
import { EventForm, PublishedCard } from './EventForm';

export function FormCreatePage() {
  const [created, setCreated] = useState<Event | null>(null);

  if (created) return <PublishedCard event={created} onReset={() => setCreated(null)} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">Post an event by form</h1>
        <p className="text-muted text-sm">
          Prefer to speak it? <Link to="/admin/new/voice" className="text-brand underline">Use your voice instead</Link>.
        </p>
      </div>
      <EventForm createdVia="form" onCreated={setCreated} />
    </div>
  );
}
