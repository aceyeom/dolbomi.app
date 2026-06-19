# DOLBOMI

**DOLBOMI** — 군인 자기개발 앱. A gamified self-development app for Korean
military service members: six stats, a real opportunity catalog, a vacation
ladder, a benefits hub, and a 3D guardian creature that evolves with XP.

A Vite + React SPA talking directly to **Supabase** (no app server). Live at
**https://dolbomi.app/**.

```bash
cd dolbomi-app && npm install && npm run dev
```

```bash
npm run build        # DOLBOMI → dist/
```

`vercel.json` serves `dist/` at the root.

---

## Get started

- **Code & local dev:** [`dolbomi-app/README.md`](./dolbomi-app/README.md)
- **Go live:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Docs:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
  [`docs/LOGIC-GAPS.md`](./docs/LOGIC-GAPS.md),
  [`docs/WORKFLOW-LOGIC.md`](./docs/WORKFLOW-LOGIC.md),
  [`docs/SURVEY-ANALYSIS.md`](./docs/SURVEY-ANALYSIS.md)
- **Backend:** `supabase/migrations/` (schema, RPCs, RLS) + `supabase/seed.sql`
  (reference content, generated)

---

## Repository layout

```
dolbomi-app/          DOLBOMI — the Vite + React SPA (served at /)
project/              DOLBOMI design-tool mockups (reference only)
scripts/              seed generator + 3D asset fetcher
supabase/
  migrations/         0001–0005 schema, RPCs, RLS
  seed.sql            reference content (generated from dolbomi-app/src/data)
docs/                 engineering docs
chats/                design handoff history
package.json          repo-root build (dolbomi-app → dist/)
vercel.json           SPA routing
DEPLOYMENT.md         go-live guide
```

## Regenerating the seed

`supabase/seed.sql` is generated from `dolbomi-app/src/data/index.js` (the single
source of truth) so the database and the SPA's offline fallback can't diverge:

```bash
npm run gen:seed     # rewrites supabase/seed.sql
```
