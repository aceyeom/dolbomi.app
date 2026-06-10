# DOLBOMI — Supabase backend

The whole backend: Postgres schema, row-level security, and the game-logic RPCs.
Apply these to a Supabase project (Seoul region) per
[../DEPLOYMENT.md](../DEPLOYMENT.md).

## Files (run in this order)

| # | File | What it does |
| --- | --- | --- |
| 1 | `migrations/0001_init.sql` | reference + per-user tables, RLS policies |
| 2 | `seed.sql` | reference content (catalog/benefits/titles/quest pool) — **generated** |
| 3 | `migrations/0002_functions.sql` | `SECURITY DEFINER` RPCs (the game logic) |

All three are idempotent (`if not exists` / `create or replace` / `truncate`),
so re-running is safe.

## Apply

**SQL Editor (simplest):** paste each file's contents and Run, in order.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push                              # applies migrations/
psql "$SUPABASE_DB_URL" -f supabase/seed.sql  # loads the seed
```

## Regenerating the seed

`seed.sql` is generated from `dolbomi-app/src/data/index.js` (the single source of
truth for reference content) so the database and the SPA's offline fallback can't
diverge. After editing the catalog:

```bash
cd dolbomi-app && npm run gen:seed   # rewrites ../supabase/seed.sql
```

Then re-run `seed.sql` in Supabase.

## Model

- **Reference tables** (`stat_defs`, `opportunities`, `milestones`, `subquests`,
  `benefits`, `titles`, `quest_pool`) — readable by any authenticated user.
- **Per-user tables** (`profiles`, `stats`, `tonight_quests`, `user_subquests`,
  `user_titles`, `checkins`, `activity`) — RLS `user_id = auth.uid()`.
- **RPCs** own all writes so XP can't be forged: `app_ensure_profile`,
  `app_toggle_tonight`, `app_toggle_subquest`, `app_add_tonight`, `app_checkin`,
  `app_equip_title` (+ helpers `app_award_titles`, `app_seoul_date`).
