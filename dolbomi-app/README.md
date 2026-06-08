# DOLBOMI — 군인 자기개발 앱

A full-stack implementation of the DOLBOMI prototype: a gamified self-development
app for Korean military service members. Soldiers grow six stats
(전투력/정신력/자산력/숙련도/지휘력/담력) by completing quests drawn from a real
opportunity catalog (certifications, contests, savings programs), climb a
**vacation ladder**, browse a **benefits hub**, and watch a **live 3D guardian
creature** evolve as their total XP rises. Progress (quest completion, plan
milestones, daily check-ins) persists to a real database.

## Tech stack

**Frontend** (this directory)
- **Vite + React 19** — SPA build pipeline (so Three.js runs in a clean client context)
- **zustand** — global store holding live, API-backed data; screens read from it
- **Three.js** — live 3D guardian avatar with a per-vertex gold shader
- **CSS custom properties** — 3 palettes (골드/택티컬/스틸) × light/dark themes

**Backend** (`server/`)
- **Express + better-sqlite3** — REST API over a SQLite database
- **JWT auth** (scrypt password hashing) — per-soldier sessions
- Standard SQL schema → swaps to Postgres for production with minimal changes

## Running the full stack

```bash
# 1. backend
cd server && npm install && npm start     # API on :4000, auto-migrates + seeds

# 2. frontend (separate terminal)
npm install && npm run dev                 # Vite on :5173, proxies /api → :4000

# …or run both at once from this directory:
npm run dev:all
```

The app auto-logs-in as the seeded demo soldier (`demo` / `dolbomi`) and loads its
state from the API. If the API is unreachable it falls back to bundled static
data so the UI still works.

### Scripts

```bash
# frontend
npm run dev          # Vite dev server (HMR)
npm run dev:all      # run backend + frontend together
npm run build        # production build → dist/
npm run preview      # serve the production build
npm run lint         # eslint
npm run test:smoke   # SSR render-test: renders every screen + overlay,
                     # fails on any runtime error (no browser needed)

# backend (in server/)
npm start            # start API (auto migrate + seed on first run)
npm run reset        # wipe + re-migrate + re-seed the DB
npm run test:api     # boots the server, asserts shapes + persistence
```

## Architecture

```
src/
├── main.jsx                 # React entry point
├── App.jsx                  # app shell: tab router, push-nav, overlays, tweaks
├── icons.jsx                # Icon(key, opts) renderer + STAT_C / STATUS maps
├── data/index.js            # single data module (soldier, stats, catalog, …)
│                            #   ← this is the frontend↔backend seam (see below)
├── styles/tokens.css        # design tokens: palettes, themes, keyframes
├── 3d/creature.js           # Three.js guardian engine (GLB load + gold shader)
├── components/
│   ├── ui.jsx               # primitives: Card, Tag, Btn, ProgressBar, StatBar…
│   ├── SkillDetail.jsx      # StatRow + per-stat quest breakdown
│   ├── Badges.jsx           # heraldic title crests
│   ├── ActivityLog.jsx      # activity timeline + monthly recap preview
│   ├── Overlays.jsx         # CheckInSheet, QuestComplete, Wrapped
│   ├── TweaksPanel.jsx      # live design-tweak controls (palette/theme/…)
│   ├── IOSFrame.jsx         # iOS 26 device chrome
│   └── creature/
│       ├── CreatureHero.jsx # React↔Three.js bridge (canvas mount)
│       ├── GuardianCard.jsx # GuardianHero + evolutionOf(stats)
│       └── AvatarViewer.jsx # full-screen avatar inspector
└── screens/
    ├── HomeScreen.jsx       # HUD: guardian, check-in, tonight's 3, stat bars
    ├── RadarScreen.jsx      # opportunity feed + category filter
    ├── OppDetail.jsx        # opportunity detail (frosted header, 신청 정보)
    ├── OppPlan.jsx          # full structured plan + OppProgressBar (shared)
    ├── VacationScreen.jsx   # vacation ladder (추천 / 진행 중 / 그 외)
    ├── BenefitsScreen.jsx   # benefits hub (4 category groups)
    └── ProfileScreen.jsx    # identity, stat radar, titles, recap
```

## How the frontend and backend connect

```
src/api/client.js   thin fetch client (stores JWT, auto-logs-in demo soldier)
src/store.js        zustand store — bootstrap() loads /api/state; screens read
                    live data from here; mutations call the API + update locally
src/data/index.js   single source of truth for SEED data + static UI config
                    (cats, moods, benefitFilters, monthly-recap copy) + the
                    offline fallback the store uses when the API is down
```

On boot, `App.jsx` calls `store.bootstrap()` → `ensureSession()` (logs in the
demo soldier if there's no token) → `GET /api/state`. Screens read **live**
data (`soldier`, `stats`, `tonight`, `catalog`, `benefits`, `titles`,
`vacation`, `activity`) from the store. Interactions call store actions, which
hit the API and reconcile with the response:

| Action | Endpoint |
| --- | --- |
| Complete one of tonight's quests | `POST /api/tonight/:questId/toggle` |
| Toggle a plan sub-quest | `POST /api/opportunities/:oppId/subquests/:subquestId/toggle` |
| Daily check-in (mood) | `POST /api/checkin` |
| Load everything | `GET /api/state` |
| Log in | `POST /auth/login` |

The server (`server/`) is a normal layered Express app:

```
server/
├── index.js              # express app; auto-migrates + seeds an empty DB on boot
├── auth.js               # scrypt hashing + JWT issue/verify + requireAuth middleware
├── db/
│   ├── schema.sql        # tables (reference data + per-soldier mutable state)
│   ├── migrate.js        # apply schema (idempotent)
│   ├── seed.js           # seed from src/data/index.js + demo soldier
│   └── index.js          # better-sqlite3 connection
├── repositories/
│   ├── state.js          # read assembler → exact frontend shapes (computes fill%)
│   └── mutations.js      # quest/subquest toggles, check-ins
└── routes/api.js         # REST routes
```

The seed imports `src/data/index.js` directly, so the prototype's data stays the
single source of truth. To move to **Postgres** in production: point a `pg`-backed
adapter at the same `schema.sql` (swap `AUTOINCREMENT`→`SERIAL`, integer bools→
`BOOLEAN`) — the repositories' SQL is standard.

## External assets & graceful fallbacks

Two assets load from public CDNs. Both degrade gracefully if the CDN is
unreachable (e.g. behind a strict network policy):

| Asset | Source | Fallback |
| --- | --- | --- |
| Guardian GLB models (ram, fox) | `static.poly.pizza` | procedural marble creature (`buildFallback()` in `3d/creature.js`) |
| Pretendard font | `cdn.jsdelivr.net` | system font stack (`-apple-system`, …) |

For a fully self-contained deploy, vendor the two `.glb` files into `public/`
and update `RAM_URL`/`FOX_URL` in `src/3d/creature.js`, and self-host
Pretendard. Opportunity photos load from Unsplash and fall back to a tinted
gradient on error.
