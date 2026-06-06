# TEMPO — 군인 자기개발 앱

A production Vite + React implementation of the TEMPO prototype: a gamified
self-development app for Korean military service members. Soldiers grow six
stats (전투력/정신력/자산력/숙련도/지휘력/담력) by completing quests drawn from a
real opportunity catalog (certifications, contests, savings programs), climb a
**vacation ladder**, browse a **benefits hub**, and watch a **live 3D guardian
creature** evolve as their total XP rises.

## Tech stack

- **Vite + React 19** — SPA build pipeline (chosen so Three.js runs in a clean
  client context)
- **Three.js** — live 3D guardian avatar with a per-vertex gold shader that
  creeps across the model as stats grow
- **CSS custom properties** — design-token system: 3 palettes (골드/택티컬/스틸)
  × light/dark themes
- Pure ES modules throughout (converted from the prototype's Babel-standalone +
  `window` globals)

## Running

```bash
npm install
npm run dev          # dev server with HMR
npm run build        # production build → dist/
npm run preview      # serve the production build
npm run lint         # eslint
npm run test:smoke   # SSR render-test: renders every screen + overlay,
                     # fails on any runtime error (no browser needed)
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

## Frontend ↔ backend seam

All app data currently lives in **`src/data/index.js`** as static exports
(`soldier`, `stats`, `tonight`, `catalog`, `vacation`, `benefits`, `titles`,
`wrapped`, `activity`). Components import from this module only — they never
hard-code data. To wire a backend, replace these exports with API/Supabase
calls returning the same shapes; no screen code needs to change. The state that
*mutates* at runtime (quest completion, milestone toggles, mood, XP pulses)
is lifted into `App.jsx` and is the natural set of write endpoints to persist.

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
