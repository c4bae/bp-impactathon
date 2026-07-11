# Contributor 4 — Org, Admin & Real AI

You own the **organizer side** (the scorecard where accountability lands) and the
**event creation** flows (form + voice), plus the **real AI integrations** that
everyone else consumes through mocks. You are the highest-integration-risk
slice — which is exactly why it's isolated: if a key dies, the other three keep
working on mocks and the demo still runs.

> You can build the UI entirely in `AI_MODE=mock`. Wire real keys only when
> you're ready to test the live path — and keep the mock working as the fallback.

---

## 0. TL;DR — what to build

| Thing | Route / File |
|---|---|
| Org scorecard | `/org` → `web/src/features/org/OrgScorecardPage.tsx` |
| Create-event choice | `/admin/new` → `web/src/features/admin/CreateEventChoicePage.tsx` (already done — tweak freely) |
| Create by form | `/admin/new/form` → `web/src/features/admin/FormCreatePage.tsx` |
| Create by voice | `/admin/new/voice` → `web/src/features/admin/VoiceCreatePage.tsx` |
| **Real AI impl** | `server/src/services/ai/live.ts` (skeleton in place; finish the `TODO(C4)`s) |

You edit `web/src/features/org/`, `web/src/features/admin/`, and
`server/src/services/ai/live.ts`. The AI **interface** (`shared/contracts.ts`)
and **mock** (`server/src/services/ai/mock.ts`) are shared — if you must change
the interface, update all three of {contracts, mock, live, client} together and
tell the team (C1/C2 call `simplify`/`tts`).

---

## 1. Setup

```bash
cp .env.example .env && npm install && npm run db:up && npm run dev
```
Mock mode is on by default. To test real AI later:
```bash
# in .env
AI_MODE=live
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-2.0-flash-001   # cheap; change if you like
ELEVENLABS_API_KEY=...
# restart the server
```

---

## 2. Org scorecard (`/org`)

### What it is
The organizer's dashboard: signups vs. attendance, **ranked blockers**
(suppression already applied), retention/repeat-attendee rate, and a
**"resolve gap"** action that flips a `reported_gap` badge to `confirmed`. This
is where Contributor 3's feedback loop becomes something an org acts on.

### Data + API
```ts
import { api } from '../../api/client';
import { getCurrentOrgId } from '../../lib/session';
import { BLOCKER_LABELS, BADGE_LABELS, type OrgScorecard } from '../../../shared/models';

const card: OrgScorecard = await api.scorecard(getCurrentOrgId());
await api.resolveGap(getCurrentOrgId(), eventId); // flips that event -> confirmed
```
`OrgScorecard` shape:
```ts
interface OrgScorecard {
  org_id: string; org_name: string;
  event_count: number;
  total_signups: number; total_attended: number;
  attendance_rate: number;        // 0..1
  repeat_attendee_rate: number;   // 0..1
  ranked_blockers: { blocker_reason: BlockerReason; count: number }[]; // suppression applied
  events: {
    event_id: string; title: string;
    signups: number; attended: number;
    badge_state: 'not_yet_verified' | 'confirmed' | 'reported_gap';
    blockers: { blocker_reason: BlockerReason; count: number }[];      // <5 suppressed
  }[];
}
```
The seeded KW Hab org (`DEMO_ORG_ID`) has the "Community Kitchen" event at
`reported_gap` with a visible `accommodation_gap` blocker — perfect for the
resolve-gap demo. **Everything sent to you is already suppressed**; you never
see counts < 5. Don't try to reconstruct them.

### Screen spec
- Header: org name + top-line metrics (attendance rate, repeat rate) as big,
  legible stat cards. Format rates as percentages.
- **Ranked blockers** across the org (bar list or simple ranked list using
  `BLOCKER_LABELS`). If empty, say "No barriers reported above the privacy
  threshold." — and explain the threshold in a tooltip/footnote.
- **Per-event table/cards**: title, signups, attended, `AccessibilityBadge`. For
  events at `reported_gap`, show the blocker(s) + a **"We've fixed this →
  Resolve gap"** `Button` calling `api.resolveGap`. On success, re-fetch and
  show the badge now `confirmed`.
- Note somewhere honest: "Thresholds are demo values; real deployment calibrates
  with KW Hab."

### Accessibility
- Stat cards are text, not just color. If you chart blockers, provide the numbers
  in text too (see the `dataviz` skill if you build a real chart — but a clean
  ranked list is enough and more accessible).
- Tables get proper `<th scope>`; the resolve button has a descriptive label
  ("Resolve accessibility gap for Community Kitchen").

### Acceptance
- [ ] Renders seeded metrics + ranked blockers (suppression respected).
- [ ] "Resolve gap" flips Community Kitchen from **Barrier reported** →
      **Accessibility confirmed**, and that badge change shows in C1's feed too.
- [ ] Switching org via nothing-to-do (single org) is fine; keep it robust if
      `getCurrentOrgId()` changes.

---

## 3. Event creation — form (`/admin/new/form`)

This is the **reliable fallback** and also the **review UI the voice flow
reuses** — build it first and well.

### API
```ts
import { api } from '../../api/client';
import { getCurrentOrgId } from '../../lib/session';
import type { CreateEventBody } from '../../../shared/contracts';

const created = await api.createEvent({
  org_id: getCurrentOrgId(),
  title, description,
  category,                 // EventCategory[]
  date_start,               // ISO string
  cost: 'free' | 'paid', cost_amount,
  accommodation_tags,       // AccommodationTag[]
  location_address,
  created_via: 'form',
  // plain_language_description: omit -> server auto-simplifies via AI
});
```
If you leave `plain_language_description` out, the server calls
`AiService.simplify()` to fill it (mock produces a real, deterministic
simplification; live uses OpenRouter). You can also let the user preview/edit it
by calling `api.simplify(description)` yourself and showing the result in an
editable field.

### Screen spec
- Controlled form using the shared `Field` wrapper + `Button`. Fields: title,
  description, category (multi-select chips), date/time, cost (free/paid +
  amount), accommodation tags (multi-select), location address.
- Optional "Preview plain-language version" button → `api.simplify` → editable.
- Submit → success state with a link to the new event's detail page
  (`/events/:id`).
- Validate required fields (title, description, date) client-side; the server
  also 400s on missing ones.

### Acceptance
- [ ] Creates an event that immediately appears in C1's feed.
- [ ] Plain-language description gets populated (auto or via preview).
- [ ] Fully keyboard + screen-reader operable form (use `Field`).

---

## 4. Event creation — voice (`/admin/new/voice`) — the stretch

Record staff speech → transcribe → structure → **let staff edit** → publish.
Build the form (§3) first; the voice screen **reuses it as the review step**.

### Flow + API
```ts
// 1. Record audio in the browser (MediaRecorder -> Blob, audio/webm).
// 2. Transcribe:
const transcript = await api.stt(audioBlob);        // ElevenLabs Scribe (live) / canned (mock)
// 3. Structure:
const draft = await api.extractEvent(transcript);   // -> ExtractedEvent
// 4. Render draft in the FORM (editable). Staff fixes anything (esp. the date —
//    the model may leave it null on purpose).
// 5. Optional: read the summary back before publishing:
const { speak } = useReadAloud();
speak(`Please confirm: ${draft.title}. ${draft.description}`);
// 6. Publish with created_via: 'voice'.
await api.createEvent({ ...draftAsBody, created_via: 'voice' });
```
`ExtractedEvent` (from `shared/contracts.ts`):
```ts
interface ExtractedEvent {
  title: string; description: string;
  date_start: string | null;   // may be null — staff fills it
  category: EventCategory[]; accommodation_tags: AccommodationTag[];
  location_address: string | null; cost: 'free' | 'paid'; cost_amount: number | null;
}
```

### Recording snippet (starting point)
```ts
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
const chunks: Blob[] = [];
rec.ondataavailable = e => chunks.push(e.data);
rec.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const transcript = await api.stt(blob);
  // ...extractEvent, show review form
};
rec.start(); /* later */ rec.stop();
```
In **mock mode** `api.stt` returns a canned transcript even with no mic, so the
review screen is demoable on any machine. Keep a **"skip recording, use sample"**
button that feeds a hardcoded transcript straight to `extractEvent` — this is
your demo safety net if the mic/venue is bad.

### Accessibility & honesty
- Recording controls need clear labels + a visible recording state (not color
  only). Provide the type-it-out fallback (link to `/admin/new/form`).
- ⚠️ **Verify Scribe early** (the MVP flagged it risky). Test real transcription
  against the actual demo mic on day 1, not the night before. If it's flaky,
  demo the form path + the "use sample transcript" voice path; the architecture
  lets you fall back without breaking anything.

### Acceptance
- [ ] Record (or "use sample") → transcript → structured draft → editable review
      → publish → event appears in the feed with `created_via: 'voice'`.
- [ ] Works in mock mode with no mic.
- [ ] Type-it-out fallback reachable.

---

## 5. Real AI implementation (`server/src/services/ai/live.ts`)

The skeleton is written and wired (selected when `AI_MODE=live`). Your job is to
verify/tune each method against real responses. All five methods have a working
first pass and fall back to the mock on parse failure:

- `simplify(description)` — OpenRouter chat, grade-5 rewrite. ✅ likely works as-is.
- `extractEvent(transcript)` — OpenRouter JSON mode → `ExtractedEvent`. Tune the
  prompt against real Scribe transcripts; never let it invent a date.
- `search(query, candidates)` — OpenRouter ranks a shortlist by id. Cheap.
- `tts(text)` — ElevenLabs TTS → mpeg bytes. Verify the voice id.
- `stt(audio, mime)` — ElevenLabs Scribe. Verify endpoint/model + latency.

Uses global `fetch` (Node 18+); no SDK to install. Keys/model come from `.env`.
Cost control: keep the model cheap (`OPENROUTER_MODEL`), pass short shortlists to
`search`, low temperature (already 0.2). Test each with:
```bash
curl -s localhost:4000/api/ai/status                              # {"mode":"live"}
curl -s -XPOST localhost:4000/api/ai/simplify -H 'content-type: application/json' \
  -d '{"description":"An accessible drop-in event with ASL interpretation."}'
curl -s -XPOST localhost:4000/api/ai/extract -H 'content-type: application/json' \
  -d '{"transcript":"Free sensory friendly art night this Friday at seven pm."}'
```
**Concentration risk to state in the pitch:** ElevenLabs is your single vendor
for *both* read-aloud and voice-create — one key, two features. The interfaces
stay swappable (browser SpeechSynthesis already backs up TTS) so a key outage
degrades gracefully instead of taking the demo down.

---

## 6. Definition of done
- [ ] Scorecard renders metrics + suppressed blockers; resolve-gap flips a badge
      end-to-end (and shows in the feed).
- [ ] Form create works and appears in the feed with auto plain-language.
- [ ] Voice create works in mock mode (no mic) and, once keys are set, with real
      Scribe + a "use sample" fallback.
- [ ] `live.ts` verified against real OpenRouter + ElevenLabs; mock still works.
- [ ] `npm run typecheck -w web` and `-w server` green.

## 7. Demo moments you own
1. "The organizer opens their scorecard: Community Kitchen shows a reported
   **accommodation gap** — aggregated past a privacy threshold so no individual
   is exposed. They fix the space and hit **Resolve gap** — the badge flips to
   **confirmed**, live, and updates in the seeker's feed."
2. "Posting a new event by voice: staff just *say* it, we transcribe and
   structure it, they confirm, done — and it's read back to them first."
