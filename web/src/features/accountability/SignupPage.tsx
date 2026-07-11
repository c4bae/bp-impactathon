import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type EventDetail } from '../../api/client';
import { useSession } from '../../lib/session';
import { Button, Card, Field, TagChip } from '../../components/ui';
import {
  ACCOMMODATION_LABELS,
  type AccommodationTag, type Signup,
} from '../../../../shared/models';

// Contributor 3 — Screen: Signup form.
// Basic info + OPTIONAL needs checkboxes (functional needs, never a
// diagnosis), a clear Skip, plain consent copy. api.signup().
// See docs/contributor-3-accountability.md.

const ALL_TAGS = Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[];

export function SignupPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { userId } = useSession();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [checked, setChecked] = useState<AccommodationTag[]>([]);
  const [submitting, setSubmitting] = useState<'share' | 'skip' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<Signup | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    api.event(eventId).then(
      (ev) => { if (!cancelled) setEvent(ev); },
      () => {},
    );
    return () => { cancelled = true; };
  }, [eventId]);

  // Prefill name/contact and saved functional needs from the demo user.
  useEffect(() => {
    let cancelled = false;
    api.users().then((users) => {
      if (cancelled) return;
      const me = users.find((u) => u.id === userId);
      if (!me) return;
      setName(me.name);
      setContact(me.contact_method ?? '');
      setChecked(me.accommodation_needs);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  function toggle(tag: AccommodationTag) {
    setChecked((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submit(kind: 'share' | 'skip') {
    if (!eventId) return;
    setSubmitting(kind);
    setSubmitError(null);
    try {
      const needs = kind === 'share' && checked.length ? checked : undefined;
      // The API upserts, so re-submitting when already signed up is safe.
      setDone(await api.signup(userId, eventId, needs));
    } catch {
      setSubmitError('Something went wrong saving your signup — please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <h1 className="text-2xl font-bold mb-2" role="status">
            You&rsquo;re signed up{event ? ` for ${event.title}` : ''}!
          </h1>
          {done.needs_flagged.length > 0 ? (
            <>
              <p className="mb-2">You told us what helps you take part:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {done.needs_flagged.map((tag) => <TagChip key={tag} tag={tag} />)}
              </div>
              <p className="text-muted text-sm mb-4">
                This only goes to improving access — it is never a medical label. Sign up
                again any time to change or clear it.
              </p>
            </>
          ) : (
            <p className="text-muted mb-4">
              You didn&rsquo;t share any access needs — that&rsquo;s completely fine. You can
              always sign up again to add them.
            </p>
          )}
          <p className="mb-4">After the event we&rsquo;ll ask how it went, so organizers hear what worked and what got in the way.</p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/events/${eventId}`} className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark">
              Back to event
            </Link>
            <Link to="/my-signups" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-brand-light text-brand-dark font-medium hover:bg-[#d6e9e2]">
              See my signups
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Sign up{event ? `: ${event.title}` : ''}</h1>
      {event && (
        <p className="text-muted mb-4">
          {new Date(event.date_start).toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
          {event.location_address ? ` · ${event.location_address}` : ''}
        </p>
      )}

      {/* The fastest, most private path is the recommended default — lead
          with it, not the optional-details form. */}
      <Card className="mb-5 border-2 border-brand bg-brand-light">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-dark">
            <span aria-hidden>⚡</span> Quick signup
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-dark">
            <span aria-hidden>🔒</span> Private signup
          </span>
        </div>
        <p className="font-medium mb-1">One tap and you&rsquo;re on the list.</p>
        <p className="text-sm text-brand-dark mb-4">
          Nothing else is asked, nothing is shared — not your name, not any access
          need. We never require that information to sign you up.
        </p>
        <Button
          type="button"
          loading={submitting === 'skip'}
          disabled={submitting !== null}
          onClick={() => void submit('skip')}
          className="w-full sm:w-auto text-lg py-3 px-6"
        >
          Sign me up — quick &amp; private
        </Button>
      </Card>

      <div className="flex items-center gap-3 text-muted text-sm mb-5" role="separator">
        <span className="h-px flex-1 bg-black/10" aria-hidden />
        or, if you&rsquo;d like
        <span className="h-px flex-1 bg-black/10" aria-hidden />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void submit('share'); }}
        noValidate
      >
        <Card className="mb-4">
          <p className="font-medium mb-1">Tell us what would help you take part</p>
          <p className="text-muted text-sm mb-3">Fully optional, and never required to sign up.</p>
          <Field label="Name (optional)" htmlFor="signup-name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full min-h-[44px] rounded-lg border border-black/15 px-3"
            />
          </Field>
          <Field label="Contact (optional)" htmlFor="signup-contact" hint="Only used if the organizer needs to reach you about this event.">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="email"
              className="w-full min-h-[44px] rounded-lg border border-black/15 px-3"
            />
          </Field>
        </Card>

        <Card className="mb-4">
          <fieldset>
            <legend className="font-medium mb-1">What helps you take part? (optional)</legend>
            <p className="text-muted text-sm mb-3">
              You can tell us what helps you take part. This is optional, only used to
              improve access, and never a medical label.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_TAGS.map((tag) => {
                const isOn = checked.includes(tag);
                return (
                  <label
                    key={tag}
                    className={`flex items-center gap-3 min-h-[44px] px-3 rounded-lg border cursor-pointer ${
                      isOn ? 'border-brand bg-brand-light text-brand-dark' : 'border-black/15'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(tag)}
                      className="h-5 w-5"
                    />
                    {ACCOMMODATION_LABELS[tag]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>

        {submitError && <p role="alert" className="text-badge-gap mb-3">{submitError}</p>}

        <Button type="submit" variant="secondary" loading={submitting === 'share'} disabled={submitting !== null}>
          Save these details and sign up
        </Button>
      </form>
    </div>
  );
}
