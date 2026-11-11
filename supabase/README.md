# The database

Project `dolbomi_db` on Supabase (Seoul, `ap-northeast-2`).

## What is in it

`migrations/0001_room.sql` is the whole schema:

| Table | What | A visitor (`anon`) may |
| --- | --- | --- |
| `public.works` | the index: one row for each work | read rows where `published` |
| `public.notes` | notes left through the form | insert `name`, `reach`, `body` |

Nothing else is granted. There is no policy to read, change or delete a note,
so the only way to read one is as the owner: the Supabase dashboard, Table
Editor, `notes`. A trigger stops the table taking more than thirty notes in an
hour.

`seed.sql` fills `works`. It is generated from `src/data/works.js`
(`npm run gen:seed`) and is an upsert, so it is safe to run again.

## Setting it up on an empty database

Run `migrations/0001_room.sql`, then `seed.sql`, each as one query in the SQL
Editor, in that order. Or with the CLI: `supabase link`, `supabase db push`,
then `psql "$DB_URL" -f supabase/seed.sql`.

## What was here before

The Dolbomi app's schema (eighteen tables, twenty-one functions, and its
thirty-three accounts), three of those tables being the first prototype of
what became Celestual. The room uses none of it, and `0001_room.sql` expects
an empty `public` schema: the old one is cleared first, once, by its owner.
Dolbomi's own migrations are in this repository's history, before the commit
that hung the room.
