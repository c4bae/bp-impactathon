# Architecture & Shared Contracts

Read this once before opening your contributor doc. It describes the seams
that let four people build in parallel without stepping on each other.

---

## 1. The parallelism model

There is **one shared foundation** (already built) and **four disjoint feature
slices** (one per contributor). Everyone imports from the foundation; nobody
imports another contributor's feature code.

```
                 ┌──────────────── shared foundation (built, stable) ─────────────────┐
                 │  db/schema.sql · shared/models.ts · shared/contracts.ts            │
                 │  server/ (all endpoints) · web/src/api · components · lib · hooks   │
                 └───────────────────────────────────────────────────────────────────┘
                        ▲              ▲                 ▲                 ▲
              ┌─────────┘        ┌─────┘           ┌─────┘           ┌────┘
        ┌─────┴─────┐      ┌─────┴─────┐     ┌─────┴──────┐    ┌─────┴──────┐
        │    C1     │      │    C2     │     │    C3      │    │    C4      │
        │ discovery │      │ quickpicks│     │accountabil.│    │ org/admin  │
        │           │      │  + route  │     │            │    │ + live AI  │
        └───────────┘      └───────────┘     └────────────┘    └────────────┘
```

**Rule of thumb:** you only ever edit files inside *your* folder(s). Everything
you need from elsewhere is reached through `web/src/api/client.ts` (data) and
`web/src/components/ui` (UI). If you feel you need to edit the foundation, it's
a coordination point — post in the team channel first.

## 2. Why nobody is blocked on API keys

All AI (OpenRouter LLM + ElevenLabs voice) sits behind the `AiService`
interface (`shared/contracts.ts`) with **two implementations**:

- `server/src/services/ai/mock.ts` — deterministic, offline, **default**.
- `server/src/services/ai/live.ts` — real APIs, owned by **Contributor 4**.

`AI_MODE=mock` (the default) means C1/C2/C3 get working AI behavior with **no
keys and no network**. C4 builds the real impl behind the identical interface;
flipping `AI_MODE=live` swaps it in with zero changes to anyone's code. Read-
aloud additionally falls back to the browser's `SpeechSynthesis` if the server
can't do TTS — so the feature works in every mode.

## 3. Data model (canonical)

Defined once in **`shared/models.ts`** and mirrored in **`db/schema.sql`**. Key
tables: `users`, `orgs`, `events`, `signups`, `quick_picks`, `routes`, plus the
derived views `barrier_reports` and `retention_metrics`.

Enums you'll use everywhere: `AccommodationTag`, `EventCategory`, `BadgeState`
(`not_yet_verified | confirmed | reported_gap`), `AttendedState`,
`BlockerReason`. Human labels for each are exported from `shared/models.ts`
(`ACCOMMODATION_LABELS`, `CATEGORY_LABELS`, `BLOCKER_LABELS`, `BADGE_LABELS`) —
**use those, don't re-type display strings.**

**Privacy invariants (do not violate):**
- Never render a barrier count below `BARRIER_SUPPRESSION_THRESHOLD` (5). The
  server already suppresses; don't reconstruct raw counts client-side.
- `needs_flagged` / `accommodation_needs` describe *needs*, never diagnoses.
- `quick_picks` feeds ranking only; never join it to accommodation data.

## 4. The API (all implemented in `server/`)

Call everything through the typed client `web/src/api/client.ts` — never raw
`fetch` in a component. Full endpoint list is in `shared/contracts.ts` and each
client method is typed. The spine:

```
GET   /api/events?user_id=&q=…      → RankedEvent[]   (ranking + NL search)
GET   /api/events/:id                → Event + org_name + route
POST  /api/signups                   → create a signup
PATCH /api/signups/:id               → attended + blocker → recompute badge
GET   /api/orgs/:id/scorecard        → OrgScorecard (suppression applied)
```

## 5. The badge feedback loop (the demo's spine)

```
feed (GET /events, ranked)
  → user signs up (POST /signups)
  → day-after follow-up (PATCH /signups/:id  {attended, blocker})
  → server recomputes barrier_reports for that event
  → if a blocker reaches the threshold, events.accessibility_badge_state
    flips to 'reported_gap'
  → next feed load shows the new badge
  → org sees it on the scorecard, hits "resolve gap" → badge flips to 'confirmed'
```

Recompute is **synchronous** on each follow-up (`server/src/badges.ts`) — demo
data is tiny, so no scheduled job. Contributor 3 owns tuning these thresholds;
they are intentionally arbitrary for the demo (flag this to judges).

## 6. Session / auth

No real auth. `web/src/lib/session.ts` holds the current demo user + org, and
the header `DemoSwitcher` lets you browse as different seeded users. Read the
current ids with `useSession()` (reactive) or `getCurrentUserId()` /
`getCurrentOrgId()`. **Never hardcode a user id in a component.**

## 7. Accessibility is everyone's job

This product is *about* access. Baseline is enforced in `web/src/index.css`
(focus rings, reduced-motion, skip link) and the `components/ui` primitives
(44px hit targets, ARIA). On top of that, each contributor's doc lists the
specific a11y acceptance criteria for their screens. Judges will screen-reader
the **card feed** and **signup form** first — C1 and C3, tighten those.

## 8. Running & verifying

```bash
npm run db:up && npm run dev     # DB + API + web
```
- API health: `curl localhost:4000/api/health` → `{ ok: true, ai_mode: "mock" }`
- Reset seed data: `npm run db:reset`
- Typecheck: `npm run typecheck -w web` / `-w server`

## 9. Conventions

- TypeScript strict. Import shared types from `../../shared/models` (relative).
- Tailwind + the color tokens in `tailwind.config.js` — don't hardcode hex.
- One feature = one folder. Export a page component per screen; `App.tsx`
  already wires the routes to them.
- Keep the mock AI working. If you change an `AiService` signature, update
  `mock.ts`, `live.ts`, `shared/contracts.ts`, and the client together (this is
  a coordination change — ping C4).
