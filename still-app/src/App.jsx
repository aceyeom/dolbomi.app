import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { submitStill, normHandle, isValidHandle } from './api/still.js'
import { makeColors, GalaxyCanvas, WarmBg, StarTags, Liftoff } from './components/ui.jsx'
import { LandingScreen, YouScreen, ThemScreen, SendoffScreen, RestingScreen, MatchScreen, PricingScreen } from './components/screens.jsx'

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
  match: MatchScreen,
  pricing: PricingScreen,
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

  // Never resume mid-animation: a stored 'sendoff' resolves to its outcome.
  const initialScreen = init.screen === 'sendoff' ? (init.matched ? 'match' : 'resting') : init.screen || 'landing'

  const [screen, setScreen] = useState(initialScreen)
  const [email, setEmail] = useState(init.email || '')
  const [me, setMe] = useState(init.me || '')
  const [them, setThem] = useState(init.them || '')
  const [sealedAt, setSealedAt] = useState(init.sealedAt || null)
  const [matched, setMatched] = useState(init.matched || false)
  // How many people you've sent off — drives the count of resting stars.
  const [sealCount, setSealCount] = useState(init.sealCount || 0)
  // The @ behind each resting star, aligned with the stars by index, so every
  // one floating in the field carries its own tag. Kept length === sealCount;
  // older stars from before tags existed pad with '' (no tag).
  const [handles, setHandles] = useState(() => {
    const stored = Array.isArray(init.handles) ? init.handles : []
    const n = init.sealCount || 0
    return stored.length >= n ? stored.slice(stored.length - n) : [...Array(n - stored.length).fill(''), ...stored]
  })
  const [error, setError] = useState('')
  // The @ → star morph overlay ({ handle }) and the live galaxy instance the
  // star-tag follows.
  const [morph, setMorph] = useState(null)
  const galaxyRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ screen, email, me, them, sealedAt, matched, sealCount, handles }))
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [screen, email, me, them, sealedAt, matched, sealCount, handles])

  const go = useCallback((s) => {
    setScreen(s)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  // Seal: record the one-way entry and learn (only for us) whether it's mutual.
  // The galaxy "send-off" plays for at least ~3.2s so the reveal always lands.
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
      const isMatch = !!res?.matched
      setMatched(isMatch)
      go(isMatch ? 'match' : 'resting')
    } catch (e) {
      console.error(e)
      setMatched(false)
      setSealCount((n) => Math.max(0, n - 1))
      setHandles((h) => h.slice(0, -1))
      setError('Something went wrong. Try again.')
      go('them')
    }
  }, [me, them, email, go])

  // Multi-entry: keep your handle + email, point the next star at someone new.
  const checkAnother = useCallback(() => {
    setThem('')
    setMatched(false)
    setError('')
    go('them')
  }, [go])

  // Demo only: preview the mutual reveal without a real match. Remove later.
  const previewMatch = useCallback(() => {
    setMatched(true)
    go('match')
  }, [go])

  const openConversation = useCallback(() => {
    const handle = normHandle(them)
    if (handle) window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer')
  }, [them])

  const screenT = { motion: MOTION, head: HEAD }
  const ctx = { email, me, them, sealedAt, matched, error, setEmail, setMe, setThem, go, seal, checkAnother, previewMatch, openConversation }
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
