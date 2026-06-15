# STILL. — does your ex still think about you?

A one-screen viral web app. You enter your Instagram @ and your ex's @. You only
ever find out it's mutual if **they** independently enter **you** back — so it's
anonymous, zero-rejection, and a little addictive. One-sided entries are never
revealed to anyone.

Live at **https://dolbomi.app/** (the previous DOLBOMI app is archived at
[`/dolbomi`](https://dolbomi.app/dolbomi)).

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
the mutual reveal; anything else shows the pending state.

## Build

The repo-root build (`../package.json`) produces both apps into `../dist`:

```bash
cd ..
npm run build        # STILL → dist/ , dolbomi → dist/dolbomi/
```

See [../DEPLOYMENT-STILL.md](../DEPLOYMENT-STILL.md) for the go-live steps.
