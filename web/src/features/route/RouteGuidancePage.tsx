import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Route } from '../../../../shared/models';
import { Card, Spinner, Toggle } from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';
import { RouteMap } from './RouteMap';

// Contributor 2 — Route guidance: single-destination "get there" screen.
// Routes are hand-authored (seeded); we render, we don't compute.
export function RouteGuidancePage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { speak, stop, speaking } = useReadAloud();

  useEffect(() => {
    let cancelled = false;
    setRoute(null);
    setNotFound(false);
    setLoadError(false);
    if (!id) { setNotFound(true); return; }
    api.route(id)
      .then((r) => { if (!cancelled) setRoute(r); })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Stop any in-flight speech when leaving the page.
  useEffect(() => () => stop(), [stop]);

  if (notFound) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">No directions yet</h1>
        <p className="text-muted mb-4">
          Step-by-step directions aren’t available for this event yet.
        </p>
        <Link to={`/events/${id}`} className="text-brand underline">Back to the event</Link>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <p className="mb-2">Couldn’t load the route.</p>
        <Link to={`/events/${id}`} className="text-brand underline">Back to the event</Link>
      </Card>
    );
  }

  if (route === null) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Loading route" />
      </div>
    );
  }

  const script =
    `${route.step_free ? 'This route is step free.' : 'Heads up: this route has stairs.'} ` +
    route.cautions
      .map((c) => `${c.severity === 'barrier' ? 'Barrier' : 'Caution'}: ${c.text}. `)
      .join('') +
    route.steps.map((s, i) => `Step ${i + 1}. ${s.text}`).join(' ');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Getting there</h1>

      <RouteMap steps={route.steps} />

      <Card className="my-4">
        <p
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${
            route.step_free ? 'bg-brand-light text-badge-confirmed' : 'bg-orange-100 text-badge-gap'
          }`}
        >
          <span aria-hidden>{route.step_free ? '✓' : '⚠'}</span>
          {route.step_free ? 'Step-free route' : 'This route has stairs'}
        </p>

        {route.cautions.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {route.cautions.map((c, i) => (
              <li
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  c.severity === 'barrier'
                    ? 'bg-red-100 text-red-900'
                    : 'bg-yellow-100 text-yellow-900'
                }`}
              >
                <span aria-hidden>{c.severity === 'barrier' ? '⛔' : '⚠'}</span>
                <span className="sr-only">
                  {c.severity === 'barrier' ? 'Barrier: ' : 'Caution: '}
                </span>
                {c.text}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1">
            <dt className="text-muted">Mode:</dt>
            <dd>{route.transit_mode === 'bus' ? 'Bus' : 'Walking'}</dd>
          </div>
          {route.nearest_accessible_stop && (
            <div className="flex gap-1">
              <dt className="text-muted">Accessible stop:</dt>
              <dd>{route.nearest_accessible_stop}</dd>
            </div>
          )}
          {route.estimated_time_minutes != null && (
            <div className="flex gap-1">
              <dt className="text-muted">Estimated time:</dt>
              <dd>~{route.estimated_time_minutes} min</dd>
            </div>
          )}
        </dl>

        <div className="mt-4">
          <Toggle
            pressed={speaking}
            label={speaking ? 'Stop' : 'Speak directions'}
            onToggle={() => (speaking ? stop() : speak(script))}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Directions</h2>
        <ol className="list-decimal ml-6 space-y-2">
          {route.steps.map((s, i) => (
            <li key={i}>{s.text}</li>
          ))}
        </ol>
      </Card>

      <p className="mt-4">
        <Link to={`/events/${route.event_id}`} className="text-brand underline">
          Back to the event
        </Link>
      </p>
    </div>
  );
}
