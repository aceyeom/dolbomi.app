# STILL. — Product Logic Analysis & Improvement Memo

> A consultant-style teardown of the STILL. mechanic. The goal is not to praise the
> idea but to **walk its logic step by step, find where it breaks, and stress-test
> every proposed improvement** — including the "let people pick an intention/message"
> idea — before recommending anything.
>
> Method for each item: **Observation → Why it matters → Stress test (where it
> fails) → Recommendation**. Nothing here is implemented; this document is the
> deliverable.

---

## 0. What STILL. actually is (grounding)

Reconstructed from the code, not the pitch:

- **Flow** (`still-app/src/App.jsx`): intro → scanning (≥2.8s suspense) → `mutual` | `pending`.
- **The one call** (`api/still.js` → `still_submit` RPC in `supabase/migrations/0006_still.sql`):
  a user records a *directed* entry `from → to` ("I still think about @them"), optionally with an email.
- **Match rule**: if the reverse entry `to → from` already exists, the pair is mutual.
  Both sides are stamped, one `still_matches` row is written, and an email is queued
  **only for sides that supplied an email**.
- **Privacy model**: clients have zero table access; the only door is the
  `SECURITY DEFINER` RPC, which returns just `{ matched: true|false }` for *your* pair.
  A one-sided entry is "never revealed."
- **Growth model**: there is none beyond the share button on the result screen.

The whole product rests on **one assumption**: *two specific people will, independently,
each type the other's handle into an obscure website.* Everything below pressure-tests
that assumption and the safety claim that wraps it.

---

## 1. User base analysis

The product copy ("your ex") narrows this more than the mechanic requires. Real segments:

| Segment | Who | Emotional state | Behavior | Implication for design |
|---|---|---|---|---|
| **Post-breakup hopefuls** | Gen Z / young millennials, 0–12 mo after a breakup | Vulnerable, hopeful, anxious | Late-night, impulsive, one-and-done | Highest virality, highest harm risk. The payoff (mutual) is rare → most leave on `pending`. |
| **Curiosity / lurkers** | Anyone with an ex or crush | Bored, nostalgic | Will try once if a friend shares | Drives reach but low intent to give email or return. |
| **Closure-seekers** | People wanting an ending, not a reunion | Resigned | Want a low-stakes signal | Today's binary "mutual" over-promises *reunion* to them. A label/intention layer serves them well. |
| **Re-kindlers** | People actively wanting to get back together | Motivated, will share aggressively | Best evangelists | The segment most hurt by a mismatch on reveal. |
| **At-risk / weaponizers** | Someone monitoring an ex they shouldn't | Obsessive / controlling | Will probe repeatedly | **Safety-critical.** A "does my ex still think about me" tool is attractive to stalkers. See §3. |

Behavioral truths to design around:
- **Email reluctance.** The privacy-cautious crowd this app attracts will skip the
  optional email — which is the *only* way to learn about a match that lands after
  they close the tab. The payoff mechanism is opt-in and most won't opt in.
- **The default outcome is anticlimax.** For any specific dyad, the odds both enter
  each other are tiny. ~Everyone sees `pending`. Retention rests entirely on whether
  `pending` gives a reason to come back. Today it does not.
- **Channel.** Given the `dolbomi.app` / Korean lineage, a Korea-first launch implies
  KakaoTalk sharing (not just native share) and Korean dating norms. Worth validating.

---

## 2. Logical integrity audit (where the mechanic breaks)

These are flaws in the *idea's logic*, independent of any new feature.

### 2.1 The anonymity guarantee is not actually held against an active prober — **critical**
- **Observation.** There is no identity. `still_submit(p_from, p_to)` lets *anyone* claim
  to be *any* `from`. The RPC returns `matched` whenever the reverse entry exists.
- **Why it matters.** To learn the secret "did Y enter X?", an attacker submits
  `from=X, to=Y`. If Y had privately entered X, the call returns `matched: true` — the
  attacker has just read someone else's one-sided, supposedly-secret crush, *without
  owning either handle.* The product's headline promise ("they never know unless it's
  mutual / we never reveal a one-sided entry") holds only against a *passive* observer,
  not against an active prober.
- **Stress test.** It gets worse with email: impersonate Y (`from=Y, from_email=mine`),
  enter `to=X`. If X had entered Y, a match fires and the notification is mailed **to the
  impersonator**, naming X. X's private feeling is exfiltrated to a stranger. The system
  cannot distinguish a genuine entrant from an impersonator because it never checks
  handle ownership.
- **Recommendation.** This is the one issue that can turn the product from "cute" to
  "harmful." Options, cheapest first: (a) **never reveal/notify on the submission that
  *creates* the reverse-completing entry unless the *other* side verified ownership** —
  i.e., a match only "counts" between two ownership-verified handles; (b) **Instagram
  OAuth** (or a one-time code DM'd to the handle) to bind a handle to a session before
  any reveal/email involving it; (c) at minimum, gate email notifications behind email
  verification + per-IP/handle rate limiting and never email a freshly-supplied address
  on the same request that triggers the match. Some friction here is the price of the
  promise the product makes in its own footer.

### 2.2 Cold-start / two-sided liquidity — **the make-or-break**
- **Observation.** A match needs *both* people to independently find the app and enter
  *each other specifically*. Probability for a given dyad is near zero until the app is
  huge inside a shared social graph.
- **Why it matters.** `pending` is the near-universal outcome. The "magic" almost never
  fires, so word-of-mouth is carried by an *unfulfilled* promise.
- **Stress test.** Even viral reach doesn't help a specific user unless their *specific*
  ex is among the entrants. Untargeted virality grows the pool but not necessarily *your*
  pair.
- **Recommendation.** Increase match surface per user (see §4.1 multi-entry) and add a
  targeted-but-safe reach loop (see §4.4). Liquidity is the product's central problem;
  treat growth features as core mechanics, not marketing.

### 2.3 Matches can be silent and unrecoverable
- **Observation.** If neither side gave an email, a mutual match is recorded but nobody
  is told unless they happen to be on the result screen or re-submit the exact pair.
- **Why it matters.** The payoff can happen *after* you leave and you'll never know. The
  emotional climax — the entire point — leaks away.
- **Recommendation.** A frictionless "remember me" magic link (§4.3) so a later match can
  reach someone who declined a full email field; make the value of leaving a contact
  point unmistakable on the `pending` screen.

### 2.4 The `pending` screen is a dead end
- **Observation.** 99% of users land here; the only action is "share." No reason to return,
  no state, no "we're watching."
- **Recommendation.** Give `pending` a forward loop: a saved watch (§4.3), a "someone may
  have entered you" hook (§4.5), or the intention layer (§5) so the screen says something
  truer and stickier than "tell people."

### 2.5 Silent match-killers: handle typos & non-existent handles
- **Observation.** No validation that a handle exists. `@jon_smith` vs `@jonsmith` never
  match; a typo'd ex is a permanent dead entry.
- **Why it matters.** Users will blame the app ("it doesn't work") when the real cause is
  a one-character mismatch they can't see.
- **Recommendation.** Light handle hygiene: show the normalized handle back to the user to
  confirm ("you'll be matched as **@jonsmith** — right?"), and consider autocomplete/typo
  suggestions. True existence-checking needs IG APIs and may be infeasible; confirmation
  is cheap and catches most.

### 2.6 No withdraw / delete in a privacy-first product
- **Observation.** Once you enter an ex, there's no way to take it back (reconciliation,
  regret, safety).
- **Why it matters.** A product whose whole pitch is privacy/consent should let people
  revoke. It's also a likely legal expectation (GDPR/erasure).
- **Recommendation.** A "withdraw this entry" magic link tied to the supplied email, or an
  un-submit on the result screen for the current session.

### 2.7 The copy over-promises a single meaning
- **Observation.** "Still thinks about you" is read by the hopeful as *wants me back* and
  by the closure-seeker as *just lingering.* The binary match can't tell them apart.
- **Why it matters.** A mutual reveal can create false hope (or false alarm). This is
  exactly the gap the intention idea (§5) is meant to fill — but only if done safely.

---

## 3. Ethics & safety (non-optional for this category)

A "find out if your ex still thinks about you" tool sits one design decision away from a
stalking/abuse aid. A consultant has to say this plainly:

- **Weaponization.** §2.1's prober vector lets a controlling ex confirm a victim's private
  feelings. Ownership verification is the mitigation, not a nice-to-have.
- **Variable-reward harm.** "Someone entered you" counters (§4.5) are a slot machine
  pointed at loneliness. They can be genuinely sticky *and* genuinely harmful. If built,
  cap frequency, avoid manufactured-scarcity dark patterns, and never fabricate counts.
- **Duty on the reveal.** A mutual reveal lands on emotionally vulnerable people. Soften
  it, offer an "I don't want to act on this" exit, and never editorialize ("go text them!").
- **Minors & consent.** Age-gate; the dynamics around teen exes are higher-risk.

These constraints should *bound* every feature below — that's why this section comes before
the feature list, not after.

---

## 4. Improvement ideas — each stress-tested

Format: **Idea → Hypothesis → Risk / where it fails → Verdict.**

### 4.1 Multi-entry (enter several people at once)
- **Hypothesis.** Letting a user enter 3–10 exes/crushes multiplies their match surface
  and directly attacks the liquidity problem (§2.2) at zero emotional cost.
- **Risk.** Turns the app from a poignant one-shot into a "scan my whole roster" tool;
  amplifies the prober vector (§2.1) — more pairs probed per session, so it **must** ship
  behind ownership verification and rate limits.
- **Verdict.** **High value, do it — but only after 2.1 is addressed.** Biggest single
  lever on the core problem.

### 4.2 Relationship type / namespace (ex · crush · situationship · friend · lost-touch)
- **Hypothesis.** The mechanic isn't really about exes; it's about *unspoken mutual
  interest*. Tagging the relationship expands TAM and gives matching a cleaner namespace
  (you only match within the same type, avoiding "I meant friend, they meant romance").
- **Risk.** Fragments the pool — a friend-match and an ex-match in different namespaces
  reduce already-thin liquidity per bucket. Mitigate by matching on the pair and
  *revealing* type compatibility rather than hard-partitioning.
- **Verdict.** **Worth testing**, but watch liquidity fragmentation. This is the *low-risk
  half* of the user's "intention" idea (see §5) and should be separated from the
  *emotional-payload half*.

### 4.3 Frictionless "remember me" (magic link instead of an email field)
- **Hypothesis.** A one-tap "save so we can tell you" (passwordless link / push) recovers
  the silent-match loss (§2.3) without the perceived weight of "give us your email."
- **Risk.** Any contact handle is a notification vector that must be verified (§2.1).
- **Verdict.** **Do it.** Directly fixes 2.3 and 2.4, low emotional risk.

### 4.4 Targeted-but-anonymous reach ("make sure it reaches them")
- **Hypothesis.** Let a user send their *specific* ex an anonymous, non-attributing nudge
  ("someone from your past is wondering — find out who by entering your exes") to convert
  `pending` into a real shot at a match.
- **Risk.** This is the most dangerous idea in the doc. Directed messaging to a named
  person = a spam/harassment/de-anonymization vector (timing alone can reveal the sender).
  Easy to abuse for "I know you're thinking about me."
- **Verdict.** **Default no / extreme caution.** If ever built: rate-limit hard, never
  reveal sender or timing, require the target to *already* be reachable through a channel
  they opted into, and run it past trust-&-safety review. Prefer untargeted virality.

### 4.5 "Someone entered you" — count-only signal
- **Hypothesis.** Show a verified user an *anonymous count* ("3 people still think about
  you — enter them to find out if any are mutual"). Solves the `pending` dead-end (§2.4),
  creates a return + monetization loop, preserves anonymity (count ≠ identity).
- **Risk.** It's a loneliness slot machine (§3). Also re-introduces the prober concern if
  the count can be farmed. Must be gated behind ownership verification and frequency caps.
- **Verdict.** **Strong loop, ship carefully.** Likely the best retention/monetization
  lever — and the most ethically loaded. Counts only, never identities; honest numbers
  only.

### 4.6 Monetization (frame, not commitment)
- **Safe-ish:** premium "tell me the *instant* it goes mutual" (real-time notify); the
  count reveal in 4.5.
- **Avoid:** "pay to boost reach to them" (4.4's abuse vector + buys access to a person);
  paywalling the core reveal (kills virality and feels extractive on vulnerable users).
- **Verdict.** Monetize *patience and breadth* (notify, multi-entry, counts), never *access
  to another person.*

### 4.7 Internationalization / share channel
- **Hypothesis.** Korea-first ⇒ Kakao share + Korean copy outperform native share + English.
- **Verdict.** Cheap to test, plausibly high ROI given the lineage. Validate the launch market first.

---

## 5. The "pick an intention / message" idea — full stress test

The user's idea: as you write a person down, choose a simple message/intention — e.g.
*"I'd want to discuss more with you,"* *"I miss you,"* *"closure,"* *"let's try again."*
This is the most interesting idea and also the one most in tension with the product's core
promise, so it gets its own section.

### 5.1 Decompose it — there are two different features hiding here
1. **Relationship/intent *type*** (closure · friends again · try again · just curious).
   Low emotional risk, mostly a *labeling/matching* concern → see §4.2.
2. **Emotional *message* payload** ("I miss you," "I'd want to discuss more").
   High emotional risk because it's a *disclosure*, not a label.

Treating these as one feature is the first mistake. They have opposite risk profiles.

### 5.2 The central logical problem: intentions make "match" two-dimensional
Today a match is symmetric and binary: *both entered → mutual.* Add intentions and a match
becomes a **pair of intentions** that may agree or clash:

| You ↓ \ Them → | Try again | Discuss more | Closure | Just curious |
|---|---|---|---|---|
| **Try again** | 💞 aligned | 🙂 promising | 💔 painful clash | ❓ ambiguous |
| **Discuss more** | 🙂 promising | 🙂 aligned | 🤝 workable | ❓ ambiguous |
| **Closure** | 💔 painful clash | 🤝 workable | ✅ clean | 😐 flat |
| **Just curious** | ❓ ambiguous | ❓ ambiguous | 😐 flat | 😐 flat |

The product must now answer: **on a mutual match, do we reveal each other's intention?**

- **Reveal both → richer, but re-introduces rejection.** "Try again" meeting "closure" is
  exactly the rejection the app was built to remove. This *breaks the core promise*
  ("zero-rejection"). Some users would now be hurt *by a match.*
- **Hide intentions → feature is decorative.** A private note no one sees adds nothing.
- **Gate the match on compatibility (only reveal if intentions align)** → loses real
  matches and silently hides mutual feeling because labels didn't line up. Worse than binary.

So the naive "let them pick and show it" design **damages** the product. Here is the design
that doesn't.

### 5.3 Recommended design: **tiered, double-opt-in reveal**
Keep the safe binary match as the floor; layer intention as a *second consensual disclosure*:

- **Tier 0 — existence (unchanged).** "You both still think about each other." Always the
  first thing shown on a mutual match. This preserves zero-rejection.
- **Tier 1 — intention badge, double-opt-in.** Each side *optionally* attaches an intention.
  On a mutual match, a side's intention is shown to the other **only if both chose to share
  one.** If either side left it blank, neither intention is revealed — the match still
  stands at Tier 0. This makes the disclosure itself reciprocal, mirroring the app's own
  founding logic one level deeper.
- **Tier 1 framing.** Show intentions as *orientation*, never as a verdict on the other
  person: "You said *discuss more.* They said *try again.*" — no 💔, no editorializing.
  The compatibility matrix in 5.2 is for *your* internal product thinking, **not** to be
  rendered to users as a score.

Why this works: the hopeful and the closure-seeker both get a truer signal than "mutual,"
*without* anyone being rejected by a match, *without* forcing disclosure, and *without*
hiding a real mutual feeling behind label-matching.

### 5.4 The message set — keep it small, oriented, non-promissory
Avoid free text (abuse, de-anonymization, pressure). Curate ~5–7 options spanning the
emotional range, phrased as *one's own stance* not a *demand on the other*:

- "I miss you."
- "I'd want to talk again."
- "I'm open to trying again."
- "I just want closure."
- "I hope you're well."
- "Just curious — no pressure."

Notes: avoid loaded promises ("I love you," "marry me") and avoid anything that pressures
("you owe me a conversation"). Each should be survivable to *receive* even from someone you
feel less strongly about.

### 5.5 Residual risks to watch
- **Disclosure pressure.** A "+ add what you'd want to say" button can feel like the *done*
  thing, nudging vulnerable users into over-disclosure. Keep it visibly optional and low-key.
- **Inference leak.** If intentions are revealed only when *both* share, then *receiving* an
  intention tells you the other side opted to share too — fine, that's the point — but make
  sure a *non-match* never leaks whether the other side attached an intention (it must not,
  since one-sided stays fully hidden).
- **Analytics temptation.** Storing intentions invites "insights" features that could erode
  anonymity. Treat the intention as the most sensitive field in the system.

### 5.6 Verdict on the user's idea
**Good instinct, but only in its double-opt-in, Tier-1 form.** As "pick a message and we
show it on a match," it quietly re-creates rejection and undermines the one thing that makes
STILL. safe. Split it into (a) a low-risk relationship-type tag (§4.2) and (b) a
reciprocal, optional intention reveal (§5.3). Ship (a) first to learn; ship (b) only with
the double-opt-in guardrail.

---

## 6. Prioritization

Impact = effect on the core problems (liquidity §2.2, payoff delivery §2.3/2.4, safety §3).

| Priority | Item | Why now | Effort |
|---|---|---|---|
| **P0** | Ownership verification (§2.1) | Closes the prober/impersonation leak; unblocks almost everything else | M–L |
| **P0** | "Remember me" magic link (§4.3) | Recovers silent matches; fixes the payoff at its root | S–M |
| **P1** | Multi-entry (§4.1) | Biggest lever on liquidity — but only after P0 | M |
| **P1** | Handle confirmation echo (§2.5) | Cheap; kills a silent failure mode | S |
| **P1** | `pending` forward loop (§2.4) | Turns the 99% case from dead-end into retention | S–M |
| **P2** | Intention layer, double-opt-in (§5.3) | High emotional value; needs care + P0 in place | M |
| **P2** | Relationship-type tag (§4.2) | TAM + cleaner matching; watch fragmentation | S–M |
| **P2** | "Someone entered you" count (§4.5) | Strongest retention/monetization; most ethically loaded | M |
| **P3** | Withdraw/delete (§2.6) | Right thing to do; likely legal expectation | S |
| **P3** | i18n / Kakao share (§4.7) | Cheap test, lineage suggests upside | S |
| **Hold** | Targeted reach (§4.4) | Abuse vector; only with trust-&-safety review | — |

**Sequencing logic:** safety (P0) is a *prerequisite*, not a parallel track — multi-entry,
counts, and the intention reveal all widen the blast radius of the §2.1 leak, so they must
not ship before it's closed.

---

## 7. Open questions for the founder

1. **Launch market & channel** — Korea-first (Kakao, Korean copy) or global (IG/TikTok, English)?
2. **Identity stance** — willing to add Instagram OAuth / a verification step? This single
   decision gates safety *and* the best features (multi-entry, counts).
3. **Scope of "person"** — stay on "your ex," or broaden to crush/friend/lost-touch (TAM vs. focus)?
4. **Reveal philosophy** — is "zero-rejection" an inviolable principle? If yes, the intention
   layer *must* be Tier-1 double-opt-in (§5.3) and never a compatibility score.
5. **Monetization appetite** — comfortable monetizing patience/breadth (notify, counts), and
   firmly *not* access-to-a-person?
6. **Safety ownership** — who owns trust & safety review before any directed-reach or
   count feature ships?

---

*This memo only analyzes and recommends; no product code was changed.*
