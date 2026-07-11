# Contributor 2 — Ranking & Wayfinding

You own two things: **Quick Picks** (the daily tap-first prompt that personalizes
ranking) and **Route guidance** (the "how do I actually get there, step-free?"
screen with a Leaflet map). You also own tuning the **ranking weights** that
Quick Picks feeds into.

> Builds fully offline in `AI_MODE=mock`. Map tiles come from OpenStreetMap (no
> key). No API keys needed.

---

## 0. TL;DR — what to build

| Screen | Route | File (replace the stub) |
|---|---|---|
| Quick Picks | `/quick-picks` | `web/src/features/quickpicks/QuickPicksPage.tsx` |
| Route guidance | `/events/:id/route` | `web/src/features/route/RouteGuidancePage.tsx` |

You edit `web/src/features/quickpicks/` and `web/src/features/route/`. You may
also tune ranking **weights** in `server/src/routes/events.ts` (the `W` object)
— that's a coordination touch, so ping the team before changing behavior C1
depends on.

---

## 1. Setup

```bash
cp .env.example .env && npm install && npm run db:up && npm run dev
```
`leaflet` is already a dependency. Open http://localhost:5173.

---

## 2. Quick Picks

### What it is
A daily card showing **3 event categories**; the user taps 👍/👎 on each. Each
response is stored and feeds a **weighted-count heuristic** in the ranking query
(no ML — honest v1). More 👍 on `arts` → arts events rank higher in C1's feed.

### Data + API
```ts
import { api } from '../../api/client';
import { getCurrentUserId } from '../../lib/session';
import { CATEGORY_LABELS, type EventCategory } from '../../../shared/models';

const { categories } = await api.quickPicksToday(getCurrentUserId()); // 3 EventCategory
await api.submitQuickPick(getCurrentUserId(), category, true /* 👍 */ | false /* 👎 */);
```
`quickPicksToday` returns 3 categories the user hasn't answered *today* (falls
back to any 3). After all 3 are answered, show a done state ("Come back
tomorrow!") and a link to `/feed` so they can see the effect.

### Screen spec
- One prompt at a time OR all three stacked — your call; keep buttons ≥44px.
- Use `CATEGORY_LABELS[cat]` for display. A friendly line per card, e.g.
  "Interested in **Arts** events?" with 👍 Yes / 👎 Not for me.
- Optimistic UI is fine; on submit, advance.
- Empty/done state + a "See your feed" `Button` linking to `/feed`.

### How it connects to ranking (context you need)
In `server/src/routes/events.ts`, the feed sums the user's quick-pick responses
per category (`+1` per 👍, `-1` per 👎) and multiplies by `W.quickPick`. The
weights:
```ts
const W = { quickPick: 3, accommodationMatch: 2.5, proximity: 2, soon: 1.5, confirmedBadge: 1 };
```
If ranking feels off during integration, tune these numbers — but keep
`accommodationMatch` meaningful (fitting someone's access needs should matter)
and **never** hide `reported_gap` events (transparency is the product).

### Acceptance
- [ ] Shows 3 categories, records 👍/👎, advances, reaches a done state.
- [ ] After voting arts 👍 as the demo user, arts events visibly rise in `/feed`.
- [ ] Keyboard + screen-reader operable; each choice is a labeled button.

---

## 3. Route guidance

### What it is
A single-destination "get there" screen for one event: a **Leaflet map** with the
route's points, an ordered **step list**, a **step-free / stairs** indicator, the
nearest accessible stop + estimated time, and a **spoken-directions** toggle.
Routes are **hand-authored** (seeded) — you render them, you don't compute them.

### Data + API
```ts
import { api } from '../../api/client';
import type { Route, RouteStep } from '../../../shared/models';

const route: Route = await api.route(eventId); // 404 if no route -> show a graceful message
```
`Route` shape:
```ts
interface Route {
  id: string;
  event_id: string;
  transit_mode: 'walk' | 'bus';
  step_free: boolean;
  nearest_accessible_stop: string | null;
  estimated_time_minutes: number | null;
  steps: { text: string; lat?: number; lng?: number }[];  // ordered
}
```
Three events have seeded routes (adaptive basketball = bus, nature walk = walk,
library morning = walk). Others 404 — handle it: "Step-by-step directions aren't
available for this event yet."

### Leaflet setup (copy-paste starting point)
Leaflet's CSS must be imported and its default marker icons need a known fix in
bundlers. Minimal working pattern:

```tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Fix Leaflet's default icon paths under Vite:
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl: iconRetina, shadowUrl });

function RouteMap({ steps }: { steps: { text: string; lat?: number; lng?: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pts = steps.filter(s => s.lat != null && s.lng != null)
                     .map(s => [s.lat!, s.lng!] as [number, number]);
    if (!ref.current || pts.length === 0) return;
    const map = L.map(ref.current).setView(pts[0], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
    L.polyline(pts, { weight: 5 }).addTo(map);
    pts.forEach((p, i) => L.marker(p).addTo(map).bindPopup(`Step ${i + 1}`));
    map.fitBounds(pts as any, { padding: [30, 30] });
    return () => { map.remove(); };
  }, [steps]);
  // The map is decorative-ish; the STEP LIST below is the accessible source of truth.
  return <div ref={ref} role="img" aria-label="Route map" style={{ height: 280 }} className="rounded-xl overflow-hidden" />;
}
```

### Spoken directions
```tsx
import { useReadAloud } from '../../hooks/useReadAloud';
const { speak, stop, speaking } = useReadAloud();
// Read the whole route as one utterance:
const script = `${route.step_free ? 'This route is step free.' : 'Heads up: this route has stairs.'} `
  + route.steps.map((s, i) => `Step ${i + 1}. ${s.text}`).join(' ');
<Toggle pressed={speaking} label={speaking ? 'Stop' : 'Speak directions'} onToggle={() => speaking ? stop() : speak(script)} />
```

### Screen spec
- Prominent **step-free** status at top: green "Step-free route" or amber
  "This route has stairs" (use tokens; include text, not just color).
- `nearest_accessible_stop` + `estimated_time_minutes` + `transit_mode` badge.
- Ordered `<ol>` of steps (this is the accessible source of truth; the map is
  supplementary).
- Map below/above the list.
- Spoken-directions toggle.
- 404 → friendly fallback message + a link back to the event.

### Acceptance
- [ ] Renders the seeded bus route (adaptive basketball) end to end: map line,
      4 steps, step-free badge, nearest stop, ~22 min.
- [ ] Steps are an ordered list readable by screen reader without the map.
- [ ] Spoken-directions toggle reads the full route.
- [ ] Events without a route show a graceful message, not a crash.

---

## 4. Definition of done
- [ ] Quick Picks records votes and demonstrably shifts the feed ranking.
- [ ] Route screen renders all three seeded routes; handles the no-route case.
- [ ] Both screens keyboard + screen-reader operable.
- [ ] `npm run typecheck -w web` green.

## 5. Demo moments you own
1. "Ava taps a few Quick Picks — watch her feed re-order toward what she likes."
2. "Getting to adaptive basketball: this route is **step-free**, boards an
   accessible bus, ~22 minutes — and it can read the directions aloud."
