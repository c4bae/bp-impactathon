# Technical MVP — KW Hab Community Discovery Platform

Assumption stated up front: this assumes a web app build (React frontend + lightweight backend), since that's the fastest path to a demoable, exportable, screen-reader-testable product in a hackathon window. If your team is stronger in Figma or a no-code tool, the screens/data model below still apply — swap the "Stack" sections only.

---

## 1. Stack (assumed, swap if needed)

- **Frontend**: React, Tailwind. Deployable as a static site (Vercel/Netlify) for a live demo link.
- **Backend**: A single lightweight API (Node/Express or a BaaS like Supabase) — favor Supabase if your team is small, since it gives you Postgres + auth + a REST layer with minimal setup time.
- **Database**: Postgres (via Supabase or similar).
- **LLM calls**: Anthropic API for plain-language simplification, structured extraction from voice/staff input, and natural-language search — one API key, three use cases.
- **Speech-to-text**: needed for the voice admin flow. **Do not commit to ElevenLabs for this specific job in the pitch until verified** — ElevenLabs' core product is text-to-speech; their speech-to-text offering (Scribe) may or may not fit your latency/accuracy needs for structured field extraction. Confirm during build, and have a fallback (browser-native Web Speech API for STT) ready so the feature isn't a single point of failure the night before pitches.
- **Text-to-speech (confirmed ElevenLabs use case)**: reading event cards aloud, and optionally reading back voice-created listings to staff for confirmation.
- **Maps/routing**: no live routing engine. Use static, hand-authored route data (see data model below) rendered with a lightweight map library (e.g. Leaflet) for the single-destination guidance screen only.

---

## 2. Data model

```
users
  id, name, contact_method, saved_location (lat/lng or postal code),
  accommodation_needs[] (enum, optional), created_at

orgs
  id, name, contact_email, verified (bool)

events
  id, org_id, title, description, plain_language_description (LLM-generated),
  category[], date_start, date_end, cost (free/paid/amount),
  age_group, location (lat/lng or address), accommodation_tags[] (enum),
  accessibility_badge_state (enum: not_yet_verified / confirmed / reported_gap),
  created_via (enum: form / voice), created_at

signups
  id, user_id, event_id, needs_flagged[] (enum, optional, references accommodation_needs),
  attended (enum: yes / no / partial / not_yet_reported),
  blocker_reason (enum: cost / transportation / accommodation_gap / scheduling / did_not_feel_welcome / other, nullable),
  created_at

quick_picks
  id, user_id, event_category, response (bool), created_at
  -- feeds ranking only, never joined to accommodation_needs

barrier_reports (derived/aggregated view, not a raw table users see)
  event_id, blocker_reason, count
  -- suppressed from any UI if count < 5, to prevent re-identification

routes (hand-authored for demo)
  id, event_id, transit_mode (walk/bus), steps[] (ordered text + optional geo points),
  step_free (bool), nearest_accessible_stop, estimated_time_minutes

retention_metrics (derived/aggregated view)
  user_id or org_id, repeat_attendance_count, last_attended_at
```

Key design choice, worth restating in the handoff doc: `accommodation_needs` and `blocker_reason` are **functional-need enums, never diagnosis fields.** No table anywhere stores a disability category against a named user. This is the single most important integrity constraint in the whole schema — it's what keeps the barrier-feedback loop informative rather than invasive, and it should be called out explicitly to judges.

---

## 3. Screens

1. **Home / question-led entry** — 2-3 prompts, returns ranked card feed.
2. **Card feed** — badge, icon tags, plain-language line, distance/transit-time badge, read-aloud toggle per card.
3. **Event detail** — full description, accommodation tags, signup CTA, "get there" link (→ Route guidance).
4. **Signup form** — basic info + optional needs checkboxes, clear skip option, plain consent copy.
5. **Route guidance** — single destination, step-free/stairs indicator, spoken directions toggle, hand-authored route.
6. **Quick Picks** — daily 3-prompt card, tap-first buttons.
7. **Post-event follow-up** — one-tap attended/not, optional blocker reason (triggered day-after, can be simulated in demo via a "simulate day passing" button).
8. **Org scorecard** — signups vs. attendance, ranked blockers, retention/repeat-attendee rate, resolve-gap action that flips the badge.
9. **Admin: create event by voice** — record/speak → structured preview → edit → publish.
10. **Admin: create event by form** — fallback/parallel path, since voice shouldn't be the *only* way to post (some staff will prefer typing, and voice tooling may not be demo-reliable).

---

## 4. Core flows, technically

**Discovery → signup → badge update (the spine)**
`GET /events?ranked_for=user_id` → user submits `POST /signups` (needs optional) → later, `PATCH /signups/:id` (attended + blocker) → scheduled or on-demand aggregation job recomputes `barrier_reports` view → if count crosses threshold, `events.accessibility_badge_state` updates → next `GET /events` call reflects new badge.

For the demo, skip a real scheduled job — recompute the aggregate synchronously on each follow-up submission, since your data volume is tiny (seeded/demo scale).

**Voice event creation**
Staff speaks → STT (Web Speech API or chosen provider) → raw transcript → single LLM call with a structured-extraction prompt returning `{title, date, location, category, accommodation_tags, description}` as JSON → rendered on a review screen → staff edits/confirms → `POST /events`. Optionally, ElevenLabs TTS reads the extracted summary back to staff before they confirm — this is the safest, most clearly-ElevenLabs part of the flow.

**Quick Picks**
`GET /quick_picks/today?user_id` returns 3 unseen event categories → `POST /quick_picks` per response → feeds a simple weighted score added to the ranking query in the card feed (no ML model needed for a hackathon — a weighted-count heuristic is enough and is honest to demo as a v1).

---

## 5. Build order (assuming a ~24-36hr window)

1. Data model + seed script (fake orgs, events, a spread of accommodation tags and pre-populated barrier reports so the badge states aren't all "not yet verified" for the demo).
2. Card feed + event detail (read-only, seeded data) — get something on screen fast.
3. Signup form + follow-up flow + badge recompute — this is your core originality mechanic, protect time for it.
4. Org scorecard.
5. Quick Picks.
6. Route guidance screen (2-3 hand-authored routes only).
7. Voice admin flow — treat as stretch; have the form fallback fully working first so this never blocks your demo.
8. Accessibility pass: screen-reader test the card feed and signup form specifically (these are what judges are most likely to probe), keyboard-navigation check, color contrast check.

---

## 6. Known technical risks to flag honestly in the handoff doc
- STT accuracy for the voice flow is unverified against your actual demo environment/mic quality — test early, don't leave it to the night before.
- Badge thresholds (what count of reports flips a badge state) are arbitrary for the demo and would need real calibration with KW Hab before production use.
- No moderation layer on barrier reports — a bad-faith or mistaken report currently has the same weight as a genuine one.
- Route data is 100% hand-authored for the demo; a real build needs a transit-accessibility data source (e.g. Grand River Transit accessible-stop data) behind it.
