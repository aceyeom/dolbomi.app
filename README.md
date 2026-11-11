# Ace Yeom

A portfolio: selected works, in a dark room, by one lamp.

The room is black. One light is in it, and the visitor holds it: under a
mouse, under a finger, on whatever has the keyboard. Everything is drawn as
it looks lit and comes out of the dark as the lamp reaches it. The works are
the only things with any colour, and each keeps its colour inside its own
object.

A Vite + React site, with a small Supabase database behind it.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

Nothing needs a backend to run. With no database configured the index is
drawn from `src/data/works.js` and the note form says it is not taking notes.

---

## What is in the room

| Where | What |
| --- | --- |
| The first wall | The name, standing off the wall in relief and lit from the lamp, with the shadows that go with it (`src/hero`) |
| Plate I, Celestual | Two phone screens. Send a note from one; the other stays dark unless one comes back, and then both light at the same moment (`src/plates/celestual`) |
| Plate II, NuvoVet | A receipt, as a clinic typed it. Hold a line to the lamp and it is read to a code, a benchmark and a finding; read them all and the decision is stamped on it (`src/plates/nuvovet`) |
| Index | Everything hung, as a list, with its picture in a frame (`src/catalogue`) |
| About | A paragraph, the links, and a note left in the database (`src/about`) |

**House lights**, in the header, turns the room's lights up: no lamp, full
contrast, everything flat. It is remembered, and it is on by itself for a
visitor whose system asks for more contrast.

`DESIGN.md` is the design system and the rules it was built to. Read it
before adding anything.

---

## Where things are

```
index.html
src/
  main.jsx, App.jsx    the page, the header, the house lights
  lamp/                the one light: lamp.js (where it is), Lit.jsx (what it falls on)
  hero/                the name in relief: relief.js is the WebGL, Hero.jsx the heading
  plates/              Plate.jsx is the grammar every work is hung in
    celestual/         the two screens, in Celestual's own glyphs and colour arithmetic
    nuvovet/           the receipt; claim.js is one claim from NuvoVet's synthetic batch
  catalogue/           the index
  about/               about, and the note
  data/                site.js (who), works.js (the index: the source of truth)
  api/db.js            the database, over fetch
  styles/              tokens.css is every colour, size and curve
public/
  fonts/               Newsreader, Jersey 10, a cut of Pretendard (all OFL)
  plates/              the pictures in the index, 4 by 5
scripts/
  gen-seed.mjs         src/data/works.js -> supabase/seed.sql
  subset-fonts.mjs     cuts Pretendard to the glyphs the receipt uses
supabase/
  migrations/          0001_room.sql: the two tables and who may do what
  seed.sql             the index (generated)
```

---

## Adding a work

1. Put its picture in `public/plates/`, 4 by 5 (800 by 1000 is plenty), as webp.
2. Add a row to `src/data/works.js`.
3. `npm run gen:seed`, and run `supabase/seed.sql` on the database.

That puts it in the index. A work that should be handled, as the two plates
are, gets a component of its own under `src/plates/` built on `Plate` and
`Stage`: the words on the left, the object on the right, a caption and two
soft keys under it. The object is the only part that is new.

A row can also be added straight in the database (`public.works`); the site
reads it on the next visit. The file stays the source of truth, so add it
there too or the next seed will not know it.

---

## The database

Supabase project `dolbomi_db` (Seoul). It was the Dolbomi app's database and
keeps the name; the portfolio's schema is `supabase/migrations/0001_room.sql`,
applied once the old schema has been cleared (`supabase/README.md`).

| Table | A visitor may | The owner |
| --- | --- | --- |
| `works` | read published rows | writes, in the dashboard or by the seed |
| `notes` | insert one (name, how to reach them, the note) | reads them in the dashboard |

There are no accounts. A note cannot be read back by anybody but the owner:
the table has an insert policy and no other. Past thirty notes in an hour it
stops taking them until the hour has moved on.

The site needs two environment variables, the same two the Vercel project
already has: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see
`.env.example`).

A free Supabase project pauses after a week with no requests. The site keeps
working when it does (the index falls back to the bundled file and the form
says a note did not go through), and any visit to the site is a request.

---

## Deploying

Vercel builds the repository root: `npm run build`, output `dist/`
(`vercel.json`). The project is `dolbomi-app` and its production branch is
`main`, so the domain it serves, `dolbomi.app`, becomes this site when this
is merged. A different domain is added in Vercel, Project, Settings, Domains.

---

## What this repository was

Until November 2026 this was Dolbomi, a self-development app for soldiers in
service. It is in the index as a work, its code is in the history before the
commit that hung the room, and its database is the one this site now uses.
