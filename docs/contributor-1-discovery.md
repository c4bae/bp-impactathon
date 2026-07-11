# Contributor 1 — Seeker Discovery

You own how a person **finds** events: the entry questions, the ranked card
feed, and the event detail page. This is the highest-traffic, most-demoed
surface and the first thing judges will screen-reader. Make it fast, calm, and
legible.

> You can build and test everything here with **zero API keys** — the backend
> runs in `AI_MODE=mock` by default. Read-aloud works via a browser fallback.

---

## 0. TL;DR — what to build

| Screen | Route | File (replace the stub) |
|---|---|---|
| Home / question-led entry | `/` | `web/src/features/discovery/HomePage.tsx` |
| Card feed | `/feed` | `web/src/features/discovery/FeedPage.tsx` |
| Event detail | `/events/:id` | `web/src/features/discovery/EventDetailPage.tsx` |

You edit **only** `web/src/features/discovery/`. Everything else you need is
imported from the shared foundation (below).

---

## 1. Setup (once)

```bash
cp .env.example .env
npm run setup          # installs deps + starts Postgres + creates/seeds DB
npm run dev            # API :4000 + web :5173
```
Open http://localhost:5173. The nav's "Viewing as" dropdown switches demo
users — use it to prove ranking changes per user.

---

## 2. The data you get

Import types from `shared/models.ts`. The feed returns `RankedEvent[]`:

```ts
interface RankedEvent {
  id: string;
  title: string;
  description: string;
  plain_language_description: string | null;   // show THIS as the one-liner
  category: EventCategory[];
  date_start: string;                            // ISO
  date_end: string | null;
  cost: 'free' | 'paid';
  cost_amount: number | null;
  age_group: string | null;
  location_address: string | null;
  accommodation_tags: AccommodationTag[];
  accessibility_badge_state: 'not_yet_verified' | 'confirmed' | 'reported_gap';
  org_name: string;
  distance_km: number | null;                    // null if user has no saved location
  score: number;
  score_reasons: string[];                       // e.g. ["fits your access needs", "close to you"]
}
```

Human-readable labels are exported — **use them, don't invent strings**:
`ACCOMMODATION_LABELS`, `CATEGORY_LABELS`, `BADGE_LABELS` from `shared/models.ts`.

---

## 3. The API you call

All via `web/src/api/client.ts` (never raw `fetch`):

```ts
import { api } from '../../api/client';
import { getCurrentUserId, useSession } from '../../lib/session';

// FEED — ranked, optionally filtered / NL-searched
const events = await api.feed({
  user_id: getCurrentUserId(),
  q,                         // optional natural-language query (routed to AI search)
  categories,                // optional EventCategory[]
  accommodation_tags,        // optional AccommodationTag[] — hard filter
  max_cost,                  // optional number
});

// EVENT DETAIL — includes org_name and the route (if one exists)
const detail = await api.event(id); // Event & { org_name, route: Route | null }
```

The ranking is already done server-side (quick-pick affinity + saved-needs
overlap + proximity + soonness + confirmed-badge bonus). You just render
`score_reasons` as little "why you're seeing this" chips if you want.

---

## 4. Shared UI you must use

From `web/src/components/ui`:

```tsx
import { Card, Button, AccessibilityBadge, TagChip, Toggle, DistanceBadge } from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';

<AccessibilityBadge state={ev.accessibility_badge_state} />   // colored, labeled, icon
<TagChip tag="step_free" />                                    // accommodation chip
<DistanceBadge km={ev.distance_km} />                          // "2.3 km away" or nothing
```

**Read-aloud per card:**
```tsx
const { speak, stop, speaking } = useReadAloud();
<Toggle
  pressed={speaking}
  label={speaking ? 'Stop' : 'Read aloud'}
  onToggle={() => speaking ? stop() : speak(`${ev.title}. ${ev.plain_language_description ?? ev.description}`)}
/>
```
This uses ElevenLabs when live, and the browser voice otherwise — you don't
handle that branching.

---

## 5. Screen specs

### 5.1 Home — question-led entry (`/`)
Goal: 2–3 tap-first prompts that pre-filter the feed. Keep it warm and short;
this audience benefits from plain language and big targets.

Suggested prompts (tap answers, no typing required to proceed):
1. **"What are you in the mood for?"** → category chips (multi-select) from
   `CATEGORY_LABELS`. Maps to `categories`.
2. **"Anything you need to feel comfortable?"** → accommodation chips from
   `ACCOMMODATION_LABELS`. Maps to `accommodation_tags`. Optional/skippable.
3. **"Keep it free?"** → yes/no. Yes maps to `max_cost = 0`.

On submit → `navigate('/feed?...')` with the choices as query params, OR lift
state; either is fine — `/feed` just needs to read them. Include a prominent
**"Just show me everything"** skip that goes straight to `/feed`.

Acceptance:
- Fully operable by keyboard and screen reader; each prompt is a labeled group
  (`role="group"` + `aria-labelledby`).
- No dead-end: there's always a way forward without answering.

### 5.2 Card feed (`/feed`)
The core screen. Render `RankedEvent[]` as a vertical list of `Card`s. Each card:
- Title (`<h2>`/`<h3>`, a real heading — screen-reader users navigate by these)
- `org_name`, date (format nicely), cost (`Free` or `$X`)
- **Plain-language one-liner** (`plain_language_description`) as the primary body
- `AccessibilityBadge` + up to ~4 `TagChip`s (+"more")
- `DistanceBadge`
- Read-aloud `Toggle`
- Whole card links to `/events/:id` (make the title a link; don't trap the
  read-aloud button inside the link)

States to handle: loading (`Spinner`), empty ("No events match — [clear
filters]"), error (friendly retry). Read the current user via `useSession()` so
the list re-fetches when the demo user changes.

Optional: a search box that sets `q` and re-calls `api.feed` (NL search); a
filter row for categories / accommodation tags / free-only.

Acceptance (judges probe this screen):
- Each card is reachable and understandable with a screen reader; badge and
  tags are announced as text, not just color/icon.
- Icon-only controls have `aria-label` / `sr-only` text.
- Contrast passes AA (tokens already do — don't override with faint grays).
- Keyboard: Tab reaches every card link and toggle in order; focus ring visible.

### 5.3 Event detail (`/events/:id`)
`api.event(id)` → full description (and plain-language version), all
`accommodation_tags`, badge, org, date/cost/age group, location address.
CTAs:
- **"Sign up"** → `/signup/:id` (Contributor 3's screen)
- **"How to get there"** → `/events/:id/route` (Contributor 2's screen) — only
  show if `detail.route` is present.
- Read-aloud toggle for the whole description.

Acceptance: page has one `<h1>` (the title); CTAs are `<Link>`/`Button` with
clear labels; back-navigation works.

---

## 6. Accessibility checklist (your screens are the a11y showcase)
- Real semantic headings, one `<h1>` per page.
- All interactive elements keyboard-reachable, visible focus (already global).
- Color is never the only signal (badges have icon + text — keep it that way).
- Respect `prefers-reduced-motion` (global CSS already does; don't add motion
  that ignores it).
- Test with VoiceOver (Cmd+F5 on macOS): tab through the feed, confirm each card
  reads title → org → plain-language → badge → tags → "read aloud".

---

## 7. Definition of done
- [ ] Home asks 2–3 skippable prompts and lands on a filtered feed.
- [ ] Feed renders ranked seeded events with badge, tags, plain-language line,
      distance, and working read-aloud.
- [ ] Switching demo user re-ranks the feed visibly.
- [ ] Detail page shows full info + working Sign-up / Get-there CTAs.
- [ ] VoiceOver pass on the feed is clean; keyboard-only pass works.
- [ ] `npm run typecheck -w web` is green.

## 8. Demo moment you're responsible for
"Here's Ava's feed — notice the sensory-friendly morning is ranked first
*because* it fits her saved needs, and it carries a green **Accessibility
confirmed** badge. I can have any card read aloud." Then hand to C3 for signup.
