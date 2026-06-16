# STILL. — does your ex still think about you?

A viral web app ("galaxy edition"). You enter your Instagram @ and your ex's @.
You only ever find out it's mutual if **they** independently enter **you** back —
so it's anonymous, zero-rejection, and a little addictive. One-sided entries are
never revealed to anyone.

Live at **https://dolbomi.app/** (the previous DOLBOMI app is archived at
[`/dolbomi`](https://dolbomi.app/dolbomi)). The UI is fully responsive: full-bleed
on a phone, and the same intimate column centered over the starfield on the web.

## Flow

A short guided flow over an animated starfield (`src/galaxy.js`), built from the
galaxy-edition design and the recommendations in [`PRODUCT-ANALYSIS.md`](./PRODUCT-ANALYSIS.md):

| Screen | What it does |
| --- | --- |
| **Landing** | The hook + "Find out". |
| **You** | Captures your email **first and emphasized**, then your handle — so a match that lands after you leave can always reach you (memo §2.3 / §4.3). |
| **Them** | The one person you can't stop thinking about. "Seal it" records the entry. |
| **Send-off** | The galaxy payoff while the lookup runs (min ~3.2s suspense). |
| **Resting** | The pending forward-loop: "we're listening", share to make it reach them (memo §2.4). |
| **Match** | The mutual reveal, with both handles and a way to open the conversation. |
| **Pricing** | One free ping, $2.99 per extra person — but **the reveal is always free** (memo §4.6). |

State persists in `localStorage`, so a refresh resumes where you left off.

## Stack

Same toolchain and **same Supabase project** as DOLBOMI — STILL. only adds the
`still_*` tables/RPC (`supabase/migrations/0006_still.sql`) and one edge function
(`supabase/functions/still-notify`). No existing table is touched.

| Layer | Service |
| --- | --- |
| Frontend SPA | Vite + React, in this folder |
| Match logic | Supabase `still_submit` RPC (`SECURITY DEFINER`, returns only yes/no) |
| Match emails | Supabase Edge Function → Resend |

## How matching works

1. The browser calls one RPC: `still_submit(p_from, p_to, p_email)`.
2. It records the one-way entry and checks for the reciprocal entry.
3. It returns **only** `{ matched: true|false }` for *your* pair — the client can
   never read who entered whom (the tables have RLS on and zero policies; the only
   way in is the `SECURITY DEFINER` RPC).
4. On a mutual match it queues an email to each side that left one; the
   `still-notify` edge function sends them via Resend.

## Run it locally

```bash
cd still-app
npm install
cp .env.example .env.local   # paste Supabase URL + anon key (optional)
npm run dev                  # demo mode if no env (enter @demo to see a match)
```

Without env vars the app runs in **demo mode**: enter `demo` as the ex's @ to see
the mutual reveal; anything else shows the resting/pending state.

## Build

The repo-root build (`../package.json`) produces both apps into `../dist`:

```bash
cd ..
npm run build        # STILL → dist/ , dolbomi → dist/dolbomi/
```

See [../DEPLOYMENT-STILL.md](../DEPLOYMENT-STILL.md) for the go-live steps.
