# Contributor 3 — Accountability Loop

You own the **originality mechanic** — the reason this project is more than a
listings app. People sign up, tell us (optionally) what they need, and after the
event report whether they went and what got in the way. That feedback rolls up
into an **accessibility badge** on the event that organizers are then held to.

Protect this. It's the spine of the pitch.

> Builds fully offline (`AI_MODE=mock`). No API keys needed.

---

## 0. TL;DR — what to build

| Screen | Route | File (replace the stub) |
|---|---|---|
| Signup form | `/signup/:eventId` | `web/src/features/accountability/SignupPage.tsx` |
| Post-event follow-up ("My Signups") | `/my-signups` | `web/src/features/accountability/MySignupsPage.tsx` |

You edit `web/src/features/accountability/`. You **also own the calibration** of
the badge logic in `server/src/badges.ts` — you may tune the thresholds there
(that file is yours), but coordinate if you change the endpoint shapes.

---

## 1. Setup

```bash
cp .env.example .env && npm run setup && npm run dev
```
Seeded so you have real material: the demo user already has 2 signups, and the
"Community Kitchen" event has **7 seeded blocker reports** (5 of them
`accommodation_gap`) so it already sits at `reported_gap`. Use it to test that
the loop and suppression behave.

---

## 2. The privacy rules you must not break

This whole feature is where privacy is easiest to get wrong. Non-negotiable:

1. **Functional needs, never diagnoses.** `needs_flagged` uses
   `AccommodationTag` (e.g. `step_free`, `sensory_friendly`). There is no
   "what's your disability" field. Don't add one. Don't free-text it.
2. **Optional and skippable.** The needs step must be genuinely skippable with a
   clear, prominent skip. Never gate signup on disclosing a need.
3. **Plain consent copy.** One or two short sentences, plain language: what
   you're collecting, why, that it's optional. No dark patterns.
4. **Never show a barrier count < 5.** The server already suppresses; you never
   compute or display raw counts. You submit one report; you don't read
   aggregates (that's the org scorecard, Contributor 4).

Say these out loud in the demo — judges care.

---

## 3. Data + API

```ts
import { api } from '../../api/client';
import { getCurrentUserId } from '../../lib/session';
import {
  ACCOMMODATION_LABELS, BLOCKER_LABELS,
  type AccommodationTag, type BlockerReason, type AttendedState, type Signup,
} from '../../../shared/models';

// SIGNUP (needs optional)
await api.signup(getCurrentUserId(), eventId, needs_flagged /* AccommodationTag[] | undefined */);

// LIST MY SIGNUPS (for the follow-up screen)
const mine: Signup[] = await api.mySignups(getCurrentUserId());

// FOLLOW-UP: report attendance + optional blocker -> server recomputes badge
const res = await api.reportAttendance(signupId, attended /* AttendedState */, blocker /* BlockerReason | null */);
// res.event_badge_state is the NEW badge after recompute — surface it!
```

`Signup` shape:
```ts
interface Signup {
  id: string; user_id: string; event_id: string;
  needs_flagged: AccommodationTag[];
  attended: 'yes' | 'no' | 'partial' | 'not_yet_reported';
  blocker: BlockerReason | null;
  created_at: string;
}
```
`BlockerReason` = `cost | transportation | accommodation_gap | scheduling |
did_not_feel_welcome | other`. Labels in `BLOCKER_LABELS`.

To show event titles alongside signups, call `api.event(signup.event_id)` per
row (fine at demo scale) or fetch once and map.

---

## 4. Screen specs

### 4.1 Signup form (`/signup/:eventId`)
Minimal, warm, mostly optional. Fields:
- (Optional) name/contact — you may prefill from the demo user; keep it light.
- **Optional needs checkboxes** — render `AccommodationTag` options from
  `ACCOMMODATION_LABELS` as a checkbox group. Use the shared `Field` wrapper for
  labels/roles. Pre-checking the user's saved `accommodation_needs` is a nice
  touch (fetch via `api.event`… actually saved needs live on the user; you can
  read them if you fetch the user — optional).
- **Consent line** (plain): e.g. "You can tell us what helps you take part. This
  is optional, only used to improve access, and never a medical label."
- Two clear actions: **"Sign me up"** and **"Skip — just sign me up"** (submits
  with no `needs_flagged`).

On success → confirmation state with a link back to the event and to
`/my-signups`. Handle the already-signed-up case gracefully (the API upserts, so
re-submit is safe).

Acceptance:
- [ ] Checkbox group is a labeled `fieldset`/`role=group`; each box keyboard-
      toggleable; screen reader announces label + state.
- [ ] Skip path works and is visually prominent (not a tiny link).
- [ ] Consent copy present and plain.

### 4.2 Post-event follow-up — "My Signups" (`/my-signups`)
Lists the user's signups. For each, if `attended === 'not_yet_reported'`, show
the follow-up prompt:
- **"Did you go?"** → one-tap `yes` / `no` / `partial`.
- If `no` or `partial`, reveal an **optional** blocker question: "What got in the
  way?" → buttons from `BLOCKER_LABELS` (+ a clear "Prefer not to say" that
  submits `blocker: null`).
- Submit → `api.reportAttendance(...)`. Surface the returned
  `event_badge_state` ("Thanks — this event is now marked **Barrier reported**")
  so the loop is visible.

**"Simulate day passing" button** (demo affordance): the real product triggers
follow-ups the day after an event. For the demo, put a button at the top —
"⏩ Simulate day passing" — that simply reveals the follow-up prompts for all
signups (even future-dated ones). Implement it as local state that flips a
"treat as past" flag; no backend needed.

Acceptance:
- [ ] Lists seeded signups for the current demo user.
- [ ] "Simulate day passing" reveals follow-up prompts.
- [ ] Reporting `no` + `accommodation_gap` on an event and repeating across
      enough users flips that event's badge (see §5 to test end-to-end).
- [ ] Blocker step is optional; "Prefer not to say" works.
- [ ] Keyboard + screen-reader operable; one-tap buttons ≥44px.

---

## 5. The badge logic (yours to calibrate — `server/src/badges.ts`)

Recompute runs **synchronously** inside `PATCH /api/signups/:id`. Current rules:

- `reported_gap` — any single blocker reason reaches the suppression threshold
  (`>= 5`) on the event.
- `confirmed` — the event has attendance and no blocker at threshold (or an org
  attests via resolve-gap).
- `not_yet_verified` — default / not enough signal.

`BARRIER_SUPPRESSION_THRESHOLD` (5) lives in `shared/models.ts`. These
thresholds are **arbitrary for the demo** — say so to judges; real calibration
needs KW Hab. You may tune them, but keep the suppression threshold and the
"functional needs only" guarantee intact.

**Test the full loop by hand:**
```bash
# As several different seeded users, sign up for one event and report a blocker.
# Because the seed already loads 'Community Kitchen' at reported_gap, the fastest
# check is: resolve it (Contributor 4's org screen) then re-report to watch it flip.
npm run db:psql
# inspect: SELECT title, accessibility_badge_state FROM events;
```
Or drive it through the UI: switch demo users via the header dropdown, sign up
+ report `accommodation_gap` on the same event until 5 are reached, then reload
the feed — the badge flips.

---

## 6. Definition of done
- [ ] Signup form: optional needs, prominent skip, plain consent, success state.
- [ ] Follow-up: one-tap attendance + optional blocker + "simulate day passing".
- [ ] Submitting a follow-up visibly updates the event's badge state.
- [ ] Privacy rules (§2) honored throughout.
- [ ] `npm run typecheck -w web` green.

## 7. Demo moment you own (the money shot)
"Ava signs up — she can *optionally* say a quiet space helps; it's a functional
need, never a diagnosis, and she can skip it. A day later she tells us she
couldn't get in because the kitchen was upstairs. Once a handful of people
report the same barrier — and only once it's aggregated past a privacy threshold
— the event's badge flips to **Barrier reported**, and the organizer sees
exactly what to fix." Hand to Contributor 4's scorecard.
