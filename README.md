# DOLBOMI — 군인 자기개발 앱

A gamified self-development app for Korean military service members. Soldiers
grow six stats by completing quests from a real opportunity catalog
(certifications, contests, savings programs), climb a **vacation ladder**, browse
a **benefits hub**, and watch a **3D guardian creature** evolve as their XP rises.

It's a **functional prototype**: real accounts, a closed XP→evolution loop, an
adaptive daily check-in, and cloud persistence.

## Stack

| Layer | Service |
| --- | --- |
| Frontend SPA | **Vercel** (Vite + React, in [`dolbomi-app/`](./dolbomi-app)) |
| Database + Auth | **Supabase** — Postgres + Auth, Seoul region |
| Domain | **dolbomi.app** via Spaceship DNS → Vercel |

There is no application server: the SPA talks to Supabase directly, with
row-level security and `SECURITY DEFINER` RPCs holding the game logic.

## Get it live

**→ [DEPLOYMENT.md](./DEPLOYMENT.md)** — click-by-click: create the Supabase
project (Seoul), run the SQL, import to Vercel with the two env vars, point
Spaceship DNS at it.

## Run it locally

```bash
cd dolbomi-app
npm install
cp .env.example .env.local    # paste your Supabase URL + anon key (optional)
npm run dev                   # offline demo if no env; full app if set
```

## Repository

```
DEPLOYMENT.md         go-live guide (Supabase + Vercel + Spaceship)
docs/                 engineering docs — ARCHITECTURE, LOGIC-GAPS (with fix status), WORKFLOW-LOGIC
supabase/             migrations/ (schema+RLS, RPCs) and seed.sql (generated from src/data)
scripts/              gen-supabase-seed.mjs — regenerates supabase/seed.sql
dolbomi-app/          the Vite + React SPA (deployed to Vercel)
chats/  project/      original design-tool transcripts + HTML mockups (reference only)
```

## Docs

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — the current stack, the
  SPA↔Supabase seam, RPC surface, schema/RLS, build & run.
- **[docs/LOGIC-GAPS.md](./docs/LOGIC-GAPS.md)** — the original defect catalogue
  plus a resolution-status table of what the migration fixed.
- **[docs/WORKFLOW-LOGIC.md](./docs/WORKFLOW-LOGIC.md)** — intended core-loop
  behaviour (design intent; predates the migration).
