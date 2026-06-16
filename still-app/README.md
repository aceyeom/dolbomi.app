# CELESTE — does your ex still think about you?

A viral web app ("galaxy edition"). You enter your Instagram @ and your ex's @.
You only ever find out it's mutual if **they** independently enter **you** back —
so it's anonymous, zero-rejection, and a little addictive. One-sided entries are
never revealed to anyone.

Live at **https://dolbomi.app/** (the previous DOLBOMI app is archived at
[`/dolbomi`](https://dolbomi.app/dolbomi)). The UI is fully responsive: full-bleed
on a phone, and the same intimate column centered over the 3D starfield on the web.

> **Name:** the product is **CELESTE**. The Supabase objects, this `still-app/`
> folder, and the `still-notify` function keep their original `still_*` names for
> continuity with the live database — only the brand/UI is renamed.

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

Same toolchain and **same Supabase project** as DOLBOMI — CELESTE only adds the
`still_*` tables/RPC (`supabase/migrations/0006_still.sql`, hardened in
`0007_still_safety.sql`) and one edge function (`supabase/functions/still-notify`).
No existing table is touched.

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
4. On a mutual match it queues an email to the **earlier** entrant (who has left
   the app); the live submitter already sees the result on screen. It never emails
   the address supplied on the request that triggers the match, which closes the
   instant email-exfiltration path (see Safety).
5. The `still-notify` edge function sends queued emails via Resend.

## Safety

`0007_still_safety.sql` adds the two cheap mitigations from the memo (§2.1/§3)
that don't need handle-ownership verification:

- **Rate limiting** — per-IP (40/hr) and per-handle (20/hr) caps on `still_submit`,
  so the "enter everyone to see who's into me" sweep trips a limit fast. The RPC
  returns `{ matched: false, error: 'rate_limited' }` when throttled.
- **No email exfiltration** — the match email only ever goes to the earlier
  entrant, never to an address typed on the triggering request, so an impersonator
  can't have a target's private feeling mailed to their own inbox.

The **complete** fix for impersonation (the on-screen `matched:true` can still
confirm a single target to a determined impersonator) is handle-ownership
verification — Instagram OAuth or a one-time code — tracked as the next P0.

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
npm run build        # CELESTE → dist/ , dolbomi → dist/dolbomi/
```

See [../DEPLOYMENT-STILL.md](../DEPLOYMENT-STILL.md) for the go-live steps.
