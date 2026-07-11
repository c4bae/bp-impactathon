# Live demo runbook — 2:30, one event, the whole loop

One story, one event: **Community Kitchen: Cook & Share**. Ava signs up, hits a
barrier, becomes the fifth report that flips the badge; the organizer sees it,
fixes it, resolves it; seekers see the confirmed badge. Every contributor's
work appears on screen; the accountability loop is the spine.

## Before you go on stage

```bash
npm run dev                     # both servers up
node scripts/demo-stage.mjs    # stages Kitchen at 4 gap reports (one shy of the flip)
```

Then in the browser: header dropdown → switch to **Ava**, open **Discover**
(`/feed`). Keep the window at a comfortable zoom. That's the whole setup.

> Re-run `node scripts/demo-stage.mjs` any time to rewind the demo — it's
> idempotent (resets to seed and re-stages).

## The script

**0:00 – 0:25 · Discover (seeker side)**
On the feed: *"This is Ava's feed — ranked for her, sensory-friendly events
first, in plain language, with a Read Aloud on every card. See these badges?
They're earned from attendee feedback, not self-declared by organizers.
Community Kitchen says 'Not yet verified' — remember it."*
→ Click **Community Kitchen: Cook & Share**.

**0:25 – 0:50 · Sign up (privacy moment)**
On the detail page click **Sign me up**. On the form: *"Ava can optionally tell
us what helps her take part — a quiet space, step-free access. Functional
needs, never a diagnosis; there is no 'what's your disability' field anywhere
in this product. It's genuinely skippable — that big skip button signs her up
without sharing anything."*
→ Tick **Step-free**, click **Sign me up**, then **See my signups**.

**0:50 – 1:20 · The follow-up → the flip (the money shot)**
*"A day after the event we check in — I'll fast-forward."*
→ Click **⏩ Simulate day passing**. On the Kitchen row: **No** → *"What got in
the way?"* → **Accommodation gap** (the kitchen was upstairs).
*"Ava is the fifth person to report this same barrier. Four reports? Nothing
shows — anywhere — because counts under five never leave the server. Five
crosses the privacy threshold…"* → point at the message: badge is now
**Barrier reported**. *"Aggregated accountability, no individual exposed."*

**1:20 – 1:35 · Seekers see it immediately**
→ Nav: **Discover**. *"Every seeker now sees the warning on the Kitchen card.
The badge is the event's reputation."*

**1:35 – 2:10 · The organizer acts (org side)**
→ Nav: **Org Dashboard** (KW Habilitation is the signed-in org).
*"Attendance, retention, and barriers ranked — already privacy-suppressed;
the org never sees small counts either. Accommodation gap: five reports on
Community Kitchen. They move the workshop downstairs and attest it…"*
→ Click **We've fixed this → Resolve gap**. Badge flips to **Accessibility
confirmed** with the confirmation message.

**2:10 – 2:30 · Close the loop**
→ Nav: **Discover**. Kitchen card now shows **Accessibility confirmed ✓**.
*"Report → aggregate past a privacy threshold → badge → fix → confirmed.
Honest caveat: the threshold of five is a demo value — real calibration
happens with KW Hab. But the loop is real, and it runs end to end, offline,
on what you just watched."*

## Say-out-loud checklist (judges care)

- Functional needs, **never diagnoses** — no disability field exists.
- Needs disclosure is **optional and skippable**, never gates signup.
- Barrier counts **< 5 are never shown anywhere** (server-side suppression).
- Thresholds are **demo values**; real calibration with KW Hab.

## If something goes sideways

- Badge didn't flip on Ava's report → you're not on Ava (check the header
  dropdown) or staging wasn't run; re-run `node scripts/demo-stage.mjs`.
- Anything else → `node scripts/demo-stage.mjs` rewinds the whole demo in ~5s.
- Verify the full path in one shot before stage time: `node __e2e-demo.mjs`
  (drives this exact runbook in headless Chrome and re-stages afterwards).
