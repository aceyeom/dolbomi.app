import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { submitStill, withdrawStill, suppressHandle, normHandle, isValidHandle } from './api/still.js'
import { makeColors, GalaxyCanvas, WarmBg, StarTags, Liftoff } from './components/ui.jsx'
import { LandingScreen, YouScreen, ThemScreen, SendoffScreen, RestingScreen, MatchScreen, PricingScreen, PrivacyScreen } from './components/screens.jsx'

// Galaxy-edition config. Palette = [you, them]; motion drives the starfield swirl.
const PALETTE = ['#FF8C66', '#FF5E8A']
const MOTION = 20
const HEAD = [{ t: 'Does your ex still' }, { t: 'think about you?', em: true }]

const SCREENS = {
  landing: LandingScreen,
  you: YouScreen,
  them: ThemScreen,
  sendoff: SendoffScreen,
  resting: RestingScreen,
  // `match` is no longer reached from the live flow (deferred reveal, §2.3):
  // the mutual "yes" lands by email. Kept as the home for a future verified
  // reveal link, never routed to synchronously.
  match: MatchScreen,
  pricing: PricingScreen,
  privacy: PrivacyScreen,
}

// Where the @ becomes a star (normalized screen coords). Both the DOM morph
// (Liftoff) and the galaxy's send-off drift use this exact point, so the star
// hands off from one to the other without a seam. Module-constant => stable
// reference, so it doesn't re-fire the galaxy's setMode effect every render.
const SENDOFF_ORIGIN = { x: 0.5, y: 0.43 }

// One persistent background lives at the App level so it never remounts between
// screens — the galaxy keeps spinning and your stars stay put. Each screen just
// declares which backdrop it wants and we cross-fade the warm overlay on top of
// the always-running galaxy canvas.
const BG = {
  landing: { warm: false, mode: 'idle', dim: 0.62 },
  you: { warm: true, variant: 'quiet', mode: 'idle' },
  them: { warm: true, variant: 'low', mode: 'idle' },
  sendoff: { warm: false, mode: 'sendoff', origin: SENDOFF_ORIGIN },
  resting: { warm: false, mode: 'resting' },
  match: { warm: false, mode: 'match' },
  pricing: { warm: true, variant: 'quiet', mode: 'idle' },
  privacy: { warm: true, variant: 'quiet', mode: 'idle' },
}

const STORE = 'celeste:v1'

export default function App() {
  const C = useMemo(() => makeColors(PALETTE), [])

  const init = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {}
    } catch {
      return {}
    }
  }, [])

  // Never resume mid-animation: a stored 'sendoff' resolves to resting (there is
  // no synchronous match outcome to resolve to anymore — §2.3).
  const initialScreen = init.screen === 'sendoff' ? 'resting' : init.screen || 'landing'

  const [screen, setScreen] = useState(initialScreen)
  const [email, setEmail] = useState(init.email || '')
  const [me, setMe] = useState(init.me || '')
  // `them` and `handles` are SECRETS (who you pined for). Per §4.3 they are NOT
  // persisted to localStorage — they live in memory only, so a shared device or
  // a curious second user can't read them back from the browser store.
  const [them, setThem] = useState('')
  const [sealedAt, setSealedAt] = useState(init.sealedAt || null)
  // One-time 18+ affirmation (§3, minors). Persisted so we only ask once.
  const [over18, setOver18] = useState(!!init.over18)
  // How many people you've sent off — drives the count of resting stars.
  const [sealCount, setSealCount] = useState(init.sealCount || 0)
  // The @ behind each resting star, aligned by index — in memory only (§4.3).
  const [handles, setHandles] = useState([])
  const [error, setError] = useState('')
  // The @ → star morph overlay ({ handle }) and the live galaxy instance the
  // star-tag follows.
  const [morph, setMorph] = useState(null)
  const galaxyRef = useRef(null)

  useEffect(() => {
    try {
      // Persist only the minimum needed to resume — never the crush graph (§4.3).
      localStorage.setItem(STORE, JSON.stringify({ screen, email, me, sealedAt, over18, sealCount }))
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [screen, email, me, sealedAt, over18, sealCount])

  const go = useCallback((s) => {
    setScreen(s)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  // Seal: record the one-way entry. Per §2.3 the server never reveals whether
  // it's mutual — everyone lands on `resting`; a real match arrives by email.
  // The galaxy "send-off" plays for at least ~3.2s so the moment still breathes.
  const seal = useCallback(async () => {
    setError('')
    if (!isValidHandle(me) || !isValidHandle(them)) {
      setError('Enter a valid Instagram @ for both.')
      return
    }
    if (normHandle(me) === normHandle(them)) {
      setError("That's your own @. Enter theirs.")
      return
    }
    setSealedAt(Date.now())
    setSealCount((n) => n + 1) // a new star to fly out and join the field
    setHandles((h) => [...h, normHandle(them)]) // its tag, aligned by index
    // The typed @ ignites into a star (DOM morph) and the galaxy's drift picks it
    // up from the same point — one continuous gesture into the field.
    setMorph({ handle: normHandle(them) })
    setTimeout(() => setMorph(null), 1250)
    go('sendoff')
    const minSuspense = new Promise((r) => setTimeout(r, 3200))
    try {
      const [res] = await Promise.all([submitStill({ me, ex: them, email }), minSuspense])
      if (res?.error === 'rate_limited') {
        setError('Whoa — slow down. Too many checks in a short time. Try again in a little while.')
        setSealCount((n) => Math.max(0, n - 1)) // never landed — take the star back
        setHandles((h) => h.slice(0, -1)) // …and its tag
        go('them')
        return
      }
      if (res?.error === 'suppressed') {
        setError('That person has asked not to be entered on CELESTE. We can’t record this one.')
        setSealCount((n) => Math.max(0, n - 1))
        setHandles((h) => h.slice(0, -1))
        go('them')
        return
      }
      go('resting')
    } catch (e) {
      console.error(e)
      setSealCount((n) => Math.max(0, n - 1))
      setHandles((h) => h.slice(0, -1))
      setError('Something went wrong. Try again.')
      go('them')
    }
  }, [me, them, email, go])

  // Multi-entry: keep your handle + email, point the next star at someone new.
  const checkAnother = useCallback(() => {
    setThem('')
    setError('')
    go('them')
  }, [go])

  // Withdraw the most recent entry from this session (§4.6). Best-effort: also
  // un-records it server-side so no future reveal can fire for that pair.
  const withdrawLast = useCallback(async () => {
    const last = handles[handles.length - 1]
    if (!last) return
    setHandles((h) => h.slice(0, -1))
    setSealCount((n) => Math.max(0, n - 1))
    try {
      await withdrawStill({ me, ex: last })
    } catch (e) {
      console.error(e)
    }
    setThem('')
    go('you')
  }, [handles, me, go])

  // "Forget on this device" (§4.3): wipe all local trace and reset to landing.
  const forget = useCallback(() => {
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
    setEmail('')
    setMe('')
    setThem('')
    setSealedAt(null)
    setSealCount(0)
    setHandles([])
    setOver18(false)
    setError('')
    go('landing')
  }, [go])

  const affirmAge = useCallback(() => setOver18(true), [])

  const openConversation = useCallback(() => {
    const handle = normHandle(them)
    if (handle) window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer')
  }, [them])

  const screenT = { motion: MOTION, head: HEAD }
  const ctx = {
    email, me, them, sealedAt, over18, error,
    setEmail, setMe, setThem, go, seal, checkAnother,
    withdrawLast, forget, affirmAge, suppressHandle, openConversation,
    canWithdraw: handles.length > 0,
  }
  const Screen = SCREENS[screen] || SCREENS.landing

  const bg = BG[screen] || BG.landing
  // Hold the last warm variant so the overlay doesn't flash a different gradient
  // while it fades out over the galaxy.
  const warmVariant = useRef('quiet')
  if (bg.warm) warmVariant.current = bg.variant

  return (
    <div className="still-app">
      {/* persistent galaxy — one instance for the whole session */}
      <GalaxyCanvas
        mode={bg.mode}
        dim={bg.dim}
        origin={bg.origin}
        seals={sealCount}
        you={C.you}
        them={C.them}
        motion={MOTION}
        onReady={(f) => (galaxyRef.current = f)}
        style={{ position: 'fixed', zIndex: 0 }}
      />
      {/* subtle @ tags — one per sealed star — floating with them in the field */}
      <StarTags fieldRef={galaxyRef} handles={handles} color={C.them} show={screen === 'sendoff' || screen === 'resting'} />
      {/* warm gradient overlay — cross-fades in on the calm entry screens */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          opacity: bg.warm ? 1 : 0,
          transition: 'opacity .6s ease',
        }}
      >
        <WarmBg C={C} variant={warmVariant.current} />
      </div>

      <div key={screen} className="fade" data-screen={screen} style={{ position: 'relative', zIndex: 4 }}>
        <Screen C={C} t={screenT} ctx={ctx} />
      </div>

      {/* @ → star morph, on top of everything during the hand-off */}
      {morph && <Liftoff C={C} handle={morph.handle} />}
    </div>
  )
}
