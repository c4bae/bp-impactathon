# KW Hab — Community Discovery Platform (Hackathon MVP)

A discovery platform that helps people find community events that actually fit
their access needs — and closes the loop by turning attendance + barrier
feedback into an **accessibility accountability signal** for organizers.

> **Integrity rule, front and center:** accommodation tags / needs / blockers are
> **functional needs, never diagnoses.** No table anywhere stores a disability
> category against a named person. This is the most important design choice in
> the project — see `db/schema.sql`.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind |
| Backend | Node + Express |
| DB | Native local Postgres (Homebrew `postgresql@16`, no Docker) |
| LLM | **OpenRouter** (cheap model, OpenAI-compatible) — simplify, extract, NL search |
| Voice | **ElevenLabs** — TTS read-aloud + Scribe STT (one vendor, one key, both directions) |
| Maps | Leaflet + OpenStreetMap tiles |
| Auth | None (deliberate) — seeded demo user/org switcher |

`AI_MODE=mock` (default) runs deterministic offline AI so **nothing depends on
API keys**. `AI_MODE=live` swaps in real OpenRouter + ElevenLabs.

---

## Prerequisites (one-time, per machine)

```bash
brew install postgresql@16     # native Postgres, no Docker
```
No manual role/DB creation needed — `npm run db:setup` handles it, connecting as
your macOS user (Homebrew's default superuser) over trust auth.

## Quick start

```bash
cp .env.example .env     # defaults work as-is for mock mode
npm run setup            # installs workspaces + starts Postgres + creates & seeds DB
npm run dev              # starts API (:4000) + web (:5173) together
```

Open http://localhost:5173. Setup seeds orgs, events, users, signups,
pre-populated barrier reports, and hand-authored routes.

**Reset the DB** (drop + recreate + reseed): `npm run db:reset`.
**Poke the DB**: `npm run db:psql`.
**Start Postgres only**: `npm run db:start`.
**Health check**: `curl localhost:4000/api/health`.

To go live with real AI: set `AI_MODE=live` + `OPENROUTER_API_KEY` +
`ELEVENLABS_API_KEY` in `.env`, restart the server.

---

## Repo layout

```
db/            schema.sql + seed.sql (loaded by `npm run db:setup`)
scripts/       db.sh — native Postgres helper (start / setup / reset / psql)
shared/        models.ts (data model) + contracts.ts (API + AI interfaces)  ← the contract everyone shares
server/        Express API — all endpoints, badge logic, AI services (mock + live)
web/           React app
  src/api/         typed API client (the ONLY way the UI talks to the server)
  src/components/  app shell + shared accessible UI primitives
  src/features/    ONE folder per contributor (see below)
docs/          ARCHITECTURE.md + one implementation doc per contributor
```

## Who owns what

| Contributor | Area | Folder(s) | Doc |
|---|---|---|---|
| 1 | Seeker Discovery | `web/src/features/discovery/` | `docs/contributor-1-discovery.md` |
| 2 | Ranking & Wayfinding | `web/src/features/quickpicks/`, `web/src/features/route/` | `docs/contributor-2-ranking-wayfinding.md` |
| 3 | Accountability Loop | `web/src/features/accountability/` | `docs/contributor-3-accountability.md` |
| 4 | Org, Admin & Real AI | `web/src/features/org/`, `web/src/features/admin/`, `server/src/services/ai/live.ts` | `docs/contributor-4-org-admin-ai.md` |

**Shared foundation** (already built — treat as stable API): `db/`, `shared/`,
`server/` endpoints, `web/src/api/`, `web/src/components/`, `web/src/lib/`,
`web/src/hooks/`. If you need a change here, coordinate — see
`docs/ARCHITECTURE.md`.

Start with **`docs/ARCHITECTURE.md`**, then your own contributor doc.
