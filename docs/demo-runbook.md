# Live demo runbook — one event, the whole loop, all 4 contributors, live AI

One spine story, one event: **Community Kitchen: Cook & Share**. Ava signs up,
hits a barrier, becomes the fifth report that flips the badge; the organizer
sees it, fixes it, resolves it; seekers see the confirmed badge. Two short
detours (Quick Picks + Route, and voice event creation) put every contributor
and both live AI vendors on screen without breaking the spine. Run with
`AI_MODE=live` — OpenRouter and ElevenLabs are both real, not mocked.

## Before you go on stage

```bash
npm run dev                     # both servers up
node scripts/demo-stage.mjs     # stages Kitchen at 4 gap reports (one shy of the flip)
```

Then in the browser: header dropdown → switch to **Ava**, open **Discover**
(`/feed`). Keep the window at a comfortable zoom. That's the whole setup.

Open a **second browser tab** too (same window, `Cmd+T`) — you'll use it
mid-demo as the organizer, so the "seeker sees it" and "organizer resolves
it" beats are two genuinely independent sessions hitting the real API, not
one tab narrating both sides.

> Re-run `node scripts/demo-stage.mjs` any time to rewind the demo — it's
> idempotent (resets to seed and re-stages).

## The walkthrough

1. **Discover.** On the feed, tap **Read this aloud** on any card, then stop it.
   *Say: "Live ElevenLabs voice, not a browser fallback — we'll use it twice
   more."* Point at a badge. *Say: "Earned from attendee feedback, not
   self-declared. Community Kitchen says 'Not yet verified' — remember it."*
   → Click **Community Kitchen: Cook & Share**.

2. **Quick Picks.** Nav → **Quick Picks**. Vote 👍 on whatever category shows
   up, then **See your feed**. Point at the re-order and the "matches your
   Quick Picks" chip. *Say: "Ranking updates live."*

3. **Route.** Open **Adaptive Basketball Drop-In → How do I get there?**.
   Point at the map and the step-free badge. Tap **Speak directions** for a
   couple seconds, then stop it. *Say: "ElevenLabs again."*
   → Navigate back to Community Kitchen's detail page to pick the spine back up.

4. **Sign up.** Click **Sign me up** on the event page. Point at the top of
   the signup screen — the **⚡ Quick signup / 🔒 Private signup** card is the
   first thing on the page. *Say: "This is the default, recommended path —
   one tap, nothing shared, nothing required."* Then scroll to the optional
   section below it. *Say: "If Ava wants to, she can tell us what helps her
   take part — functional needs, never a diagnosis. There's no 'what's your
   disability' field anywhere in this product."* → Tick **Step-free**, click
   **Save these details and sign up**, then **See my signups**.

5. **The flip — the money shot.** On the Kitchen row (the follow-up prompt is
   already open — the event genuinely happened, no "simulate" needed): **No**
   → **Accommodation gap**. *Say: "Ava's the fifth person to report this.
   Four reports show nothing, anywhere — counts under five never leave the
   server. Five crosses the threshold…"* → point at the badge: now **Barrier
   reported**. *Say: "Aggregated accountability, no individual exposed."*

6. **The organizer resolves it — in the other tab, live.** Switch to your
   **second tab**, open **Org Dashboard**. *Say: "Different tab, different
   session — this is the same server Ava just talked to, nothing staged
   between them."* Point at the privacy-suppressed ranked blockers already
   showing Ava's report. Click **We've fixed this → Resolve gap** — badge
   flips to **Accessibility confirmed** right there.
   → Switch back to **Ava's tab**, nav to **Discover**. *Say: "Ava didn't do
   anything — she just checks back and the fix is there."* Point at the
   Kitchen card: **Accessibility confirmed ✓**.

7. **Post an event by voice — the AI showcase.** Nav → **Post Event → By
   voice**. Click **Skip recording — use a sample** (avoids depending on a
   conference mic; the mic path is verified separately). Click **Structure
   the details**. *Say: "Live OpenRouter, turning free speech into structured
   fields, right now."* Click **Read this back to me**. *Say: "Live
   ElevenLabs reads it back for staff to confirm before anything publishes —
   never guessing a date, never publishing unconfirmed."* Fill in the date,
   click **Publish event**, then jump back to **Discover** and show it live
   in the feed.

8. **Close.** *Say: "The threshold of five is a demo value — real
    calibration happens with KW Hab. But the loop is real, and both AI
    vendors you just saw are live, not mocked."*

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
