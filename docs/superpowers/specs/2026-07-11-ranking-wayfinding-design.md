# Design: Ranking & Wayfinding (Contributor 2)

**Date:** 2026-07-11
**Scope:** Quick Picks (`/quick-picks`) and Route Guidance (`/events/:id/route`).
Implements `docs/contributor-2-ranking-wayfinding.md`.

## Decisions

- **Quick Picks layout:** one prompt at a time with progress dots, not stacked.
- **Route layout:** map hero on top → info banner → ordered step list.
- **Ranking weights:** `W` in `server/src/routes/events.ts` is left untouched.
- **Structure (Option B):** two page files plus one extracted `RouteMap`
  component; no changes outside `web/src/features/quickpicks/` and
  `web/src/features/route/`.

## Files

| File | Role |
|---|---|
| `web/src/features/quickpicks/QuickPicksPage.tsx` | Replace stub: daily 3-prompt flow |
| `web/src/features/route/RouteGuidancePage.tsx` | Replace stub: fetch + layout + speak toggle |
| `web/src/features/route/RouteMap.tsx` | New: all Leaflet imperative code, isolated behind a `steps` prop |

All data access via the existing `api` client (`quickPicksToday`,
`submitQuickPick`, `route`). UI built from shared primitives (`Button`, `Card`,
`Toggle`, `Spinner`); no hand-rolled controls.

## Quick Picks

State machine: `categories` (fetched on mount for `getCurrentUserId()`),
`index`, `loading`, `error`.

- Loading → one card at a time: "Interested in **{CATEGORY_LABELS[cat]}**
  events?" with progress dots + "1 of 3", 👍 Yes / 👎 Not for me as shared
  `Button`s (≥44px).
- On tap: submit optimistically (`api.submitQuickPick`), advance immediately.
  A failed submit shows a small inline notice but does not retreat the card.
- After the third answer (or if the API returns 0 categories): done state —
  "That's it for today — come back tomorrow!" + **See your feed** → `/feed`.
- A11y: prompt is a heading; `aria-live="polite"` region announces
  "Question N of 3"; everything keyboard/SR operable.

## Route Guidance

`api.route(id)` on mount. Layout top-to-bottom:

1. **Map hero** — `RouteMap` renders tile layer, polyline through steps with
   coordinates, numbered markers, `fitBounds`. The container is a single
   `role="img"` element with an `aria-label`, so screen readers pass it in one
   stop; the step list below remains the accessible source of truth.
2. **Info banner** — step-free status (green "Step-free route" / amber "This
   route has stairs", text + color), transit-mode badge, nearest accessible
   stop, estimated minutes, and the spoken-directions `Toggle`.
3. **Steps** — ordered `<ol>` of `step.text`.

Spoken directions use `useReadAloud` with one utterance: step-free preamble +
"Step N. …" for each step.

`RouteMap.tsx` owns the known Vite icon-path fix and map cleanup
(`map.remove()` on unmount). If the map fails or no steps have coordinates,
the page still renders banner + steps.

## Error handling

- Route 404 (`ApiError.status === 404`): friendly message — "Step-by-step
  directions aren't available for this event yet." + link back to
  `/events/:id`. No crash.
- Other fetch errors on either page: inline error message with retry link.

## Testing / acceptance

- `npm run typecheck -w web` green.
- Quick Picks: 3 categories shown, votes recorded, done state reached; arts 👍
  as demo user visibly raises arts events in `/feed`.
- Route: seeded bus route (adaptive basketball) renders map line, 4 steps,
  step-free badge, nearest stop, ~22 min; walk routes render; no-route events
  show the fallback; speak toggle reads the full route.
- Keyboard + screen-reader pass on both screens.
