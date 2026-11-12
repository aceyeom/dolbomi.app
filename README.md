# Ace Yeom

A portfolio. A black room, one red light made of dots, and letters that
swell where it falls.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

Vite + React. Nothing needs a backend to run: with no database configured
the index is drawn from `src/data/works.js` and the note form says it is not
taking notes.

`DESIGN.md` is the design system. Read it before adding anything.

## What is in it

| Where | What |
| --- | --- |
| First wall | The name. Hairline in the dark, and the heaviest cut of the face under the lamp (`src/hero`, `src/type`) |
| I, Celestual | Its wall of letters in 3D: the scroll pulls the camera back from one letter to all of them. Two phones that light only when a note is mutual. Its film (`src/wall`, `src/plates/celestual`) |
| II, NuvoVet | A receipt and NuvoVet's own rendered laptop: the lid opens, each line of the receipt is read on its screen, and the decision is stamped on the paper (`src/plates/nuvovet`) |
| III, Index | Every work as a picture, dithered in the dark and itself under the lamp (`src/index`) |
| IV, Note | A note, kept in the database (`src/contact`) |

**Lights**, in the header, turns the room's lights up for anyone who would
rather not read by a lamp.

## What it is made of

| From | What |
| --- | --- |
| [three.js](https://threejs.org) | the wall (loaded only as the wall comes near) |
| [Paper Shaders](https://shaders.paper.design) | the dither on the index's pictures |
| [Lenis](https://lenis.darkroom.engineering) | the scroll's inertia |
| Fontsource | Roboto Flex and Doto (both OFL) |
| Celestual's repository | the sheet of 126 letters, the film, the screen's glyphs and colours, Jersey 10 |
| NuvoVet's repository | the laptop render (24 frames and a still), one synthetic claim, Pretendard |

`public/media` holds the heavy things: `wall.webp` (the letters), a 2.6 MB
silent cut of the film, and the laptop frames.

## Adding a work

1. Put its picture in `public/plates/`, 4 by 5, as webp.
2. Add a row to `src/data/works.js`.
3. `npm run gen:seed`, and run `supabase/seed.sql` on the database.

That puts it in the index. A work that should be handled, as the first two
are, gets its own folder under `src/plates/` and opens with `WorkHead`.

## The database

Supabase project `dolbomi_db` (Seoul). `supabase/README.md` has the detail.

| Table | A visitor may | The owner |
| --- | --- | --- |
| `works` | read published rows | writes, in the dashboard or by the seed |
| `notes` | insert one | reads them in the dashboard |

The site needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(`.env.example`), which the Vercel project already has.

## Deploying

Vercel builds the repository root: `npm run build`, output `dist/`
(`vercel.json`). The project is `dolbomi-app`; its production branch is
`main` and its domain is `dolbomi.app`.

## What this repository was

Until November 2026 this was Dolbomi, a self-development app for soldiers in
service. It is in the index as a work, and its code is in the history.
