# Ranking & Wayfinding (Contributor 2) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two Contributor 2 stubs with a working Quick Picks flow and a Route Guidance screen per `docs/superpowers/specs/2026-07-11-ranking-wayfinding-design.md`.

**Architecture:** Two page components plus one extracted `RouteMap` component that isolates all imperative Leaflet code. All data via the existing typed `api` client; all controls via the shared UI primitives. No server or shared-code changes; `W` weights untouched.

**Tech Stack:** React 18 + TypeScript + Tailwind (existing tokens), react-router-dom 6, Leaflet 1.9 (already a dependency), `useReadAloud` hook for spoken directions.

**Verification note:** This repo has no unit-test harness (deliberate hackathon scope; definition of done in `docs/contributor-2-ranking-wayfinding.md` is `npm run typecheck -w web` + acceptance checks). Each task therefore ends with typecheck + a concrete manual verification against the seeded DB instead of a unit test. Prereq: `npm run dev` running (API :4000, web :5173) with the seeded database.

**Import-path gotcha:** From `web/src/features/<x>/File.tsx`, shared models are at `../../../../shared/models` (four `../`). The contributor doc's snippet shows three — that's wrong for feature files; `web/src/components/ui/index.tsx` confirms four from an equivalent depth.

---

## Chunk 1: Quick Picks

### Task 1: QuickPicksPage

**Files:**
- Modify (full replace): `web/src/features/quickpicks/QuickPicksPage.tsx`

- [ ] **Step 1: Replace the stub with the implementation**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { CATEGORY_LABELS, type EventCategory } from '../../../../shared/models';
import { Button, Card, Spinner } from '../../components/ui';

// Contributor 2 — Quick Picks: daily 3-prompt card, one category at a time.
// Each 👍/👎 feeds the weighted-count ranking heuristic behind /feed.
export function QuickPicksPage() {
  const { userId } = useSession();
  const [categories, setCategories] = useState<EventCategory[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCategories(null);
    setIndex(0);
    setLoadError(false);
    setSubmitNote(null);
    api.quickPicksToday(userId)
      .then((r) => { if (!cancelled) setCategories(r.categories); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [userId]);

  function vote(category: EventCategory, response: boolean) {
    // Optimistic: advance immediately; a failed save is noted but never
    // retreats the card.
    api.submitQuickPick(userId, category, response).catch(() =>
      setSubmitNote('One answer failed to save — it may not count toward your feed today.'),
    );
    setIndex((i) => i + 1);
  }

  if (loadError) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="mb-3">Could not load today’s Quick Picks.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  if (categories === null) {
    return (
      <div className="flex justify-center py-12" aria-label="Loading Quick Picks">
        <Spinner label="Loading Quick Picks" />
      </div>
    );
  }

  const done = index >= categories.length;

  if (done) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-semibold mb-2">
          {categories.length > 0 ? 'That’s it for today! 🎉' : 'All caught up! 🎉'}
        </h1>
        <p className="text-muted mb-4">
          Your picks help us rank events you’ll actually like. Come back tomorrow for more.
        </p>
        <Link
          to="/feed"
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg font-medium bg-brand text-white hover:bg-brand-dark"
        >
          See your feed
        </Link>
      </Card>
    );
  }

  const category = categories[index];

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Quick Picks</h1>
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {categories.map((c, i) => (
              <span
                key={c}
                className={`h-2.5 w-2.5 rounded-full ${i < index ? 'bg-brand' : i === index ? 'bg-brand-dark' : 'bg-black/15'}`}
              />
            ))}
          </span>
          <span className="text-sm text-muted">{index + 1} of {categories.length}</span>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Question {index + 1} of {categories.length}
      </p>

      <Card className="text-center py-8">
        <h2 className="text-xl mb-6">
          Interested in <strong>{CATEGORY_LABELS[category]}</strong> events?
        </h2>
        <div className="flex justify-center gap-3">
          <Button onClick={() => vote(category, true)} className="min-w-[130px] text-lg">
            <span aria-hidden>👍</span> Yes
          </Button>
          <Button variant="secondary" onClick={() => vote(category, false)} className="min-w-[130px] text-lg">
            <span aria-hidden>👎</span> Not for me
          </Button>
        </div>
      </Card>

      {submitNote && <p role="alert" className="text-badge-gap text-sm mt-3">{submitNote}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w web`
Expected: exits 0, no output.

- [ ] **Step 3: Manual verification (seeded demo user)**

1. Open http://localhost:5173/quick-picks — see "1 of 3", a category prompt, two buttons.
2. Answer all three → done state with "See your feed".
3. `npm run db:psql` → `SELECT event_category, response FROM quick_picks ORDER BY created_at DESC LIMIT 3;` shows the three votes for the demo user.
4. Reload `/quick-picks` — server returns fresh/fallback categories per its own logic; page must not crash either way (0 categories → done state immediately).
5. Vote 👍 on `arts`-adjacent prompts, then open `/feed` (or `curl -s 'localhost:4000/api/events?user_id=11111111-1111-1111-1111-111111111111' | head -c 600`) — arts events rank higher / `score_reasons` mentions quick picks.
6. Keyboard-only pass: Tab reaches both buttons, Enter votes.

- [ ] **Step 4: Commit**

```bash
git add web/src/features/quickpicks/QuickPicksPage.tsx
git commit -m "feat(quickpicks): daily one-at-a-time quick picks flow"
```

---

## Chunk 2: Route Guidance

### Task 2: RouteMap component

**Files:**
- Create: `web/src/features/route/RouteMap.tsx`

- [ ] **Step 1: Create the component (all Leaflet code isolated here)**

```tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteStep } from '../../../../shared/models';
// Fix Leaflet's default icon paths under Vite:
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl: iconRetina, shadowUrl });

// Renders the hand-authored route on an OSM map. Supplementary visual only —
// the ordered step list on the page is the accessible source of truth, so
// this container is a single labelled image stop for screen readers.
export function RouteMap({ steps }: { steps: RouteStep[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pts = steps
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => [s.lat!, s.lng!] as [number, number]);
    if (!ref.current || pts.length === 0) return;

    const map = L.map(ref.current).setView(pts[0], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.polyline(pts, { weight: 5 }).addTo(map);
    pts.forEach((p, i) => L.marker(p).addTo(map).bindPopup(`Step ${i + 1}`));
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });

    return () => { map.remove(); };
  }, [steps]);

  const hasPoints = steps.some((s) => s.lat != null && s.lng != null);
  if (!hasPoints) return null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Map of the route. Step-by-step directions are listed below."
      style={{ height: 300 }}
      className="rounded-xl overflow-hidden border border-black/10"
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w web`
Expected: exits 0. If the PNG imports error, add them to `web/src/vite-env.d.ts` scope — Vite's default `vite/client` types (already referenced) cover `*.png`, so no change should be needed.

- [ ] **Step 3: Commit**

```bash
git add web/src/features/route/RouteMap.tsx
git commit -m "feat(route): RouteMap Leaflet component with Vite icon fix"
```

### Task 3: RouteGuidancePage

**Files:**
- Modify (full replace): `web/src/features/route/RouteGuidancePage.tsx`

- [ ] **Step 1: Replace the stub with the implementation**

Layout (approved design): map hero on top → step-free banner + trip facts + speak toggle → ordered step list. 404 → friendly fallback.

```tsx
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
      <div className="flex justify-center py-12" aria-label="Loading route">
        <Spinner label="Loading route" />
      </div>
    );
  }

  const script =
    `${route.step_free ? 'This route is step free.' : 'Heads up: this route has stairs.'} ` +
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

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1">
            <dt className="text-muted">Mode:</dt>
            <dd>{route.transit_mode === 'bus' ? '🚌 Bus' : '🚶 Walking'}</dd>
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w web`
Expected: exits 0.

- [ ] **Step 3: Manual verification (seeded routes)**

1. Find the three routed events: `npm run db:psql` → `SELECT e.id, e.title, r.transit_mode FROM routes r JOIN events e ON e.id = r.event_id;`
2. Open `/events/<adaptive-basketball-id>/route` — map with polyline + markers, "Step-free route" green badge, 🚌 Bus, nearest stop, ~22 min, 4 ordered steps.
3. Both walk routes render similarly.
4. "Speak directions" reads the preamble + all steps (browser SpeechSynthesis in mock mode); toggling again stops.
5. An event WITHOUT a route (any other event id) shows "No directions yet" + back link — no crash.
6. Screen-reader sanity: map is a single labelled stop; step list is a real `<ol>`.

- [ ] **Step 4: Commit**

```bash
git add web/src/features/route/RouteGuidancePage.tsx
git commit -m "feat(route): route guidance screen with map, steps, spoken directions"
```

---

## Chunk 3: Final acceptance

### Task 4: End-to-end acceptance pass

- [ ] **Step 1: Full acceptance checklist** (from `docs/contributor-2-ranking-wayfinding.md` §4)

- Quick Picks records votes and demonstrably shifts `/feed` ranking (vote arts 👍 as demo user, confirm arts rises).
- Route screen renders all three seeded routes; no-route case graceful.
- Both screens keyboard-operable end to end.
- `npm run typecheck -w web` green.

- [ ] **Step 2: Commit any fixes; done**
