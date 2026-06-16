import { useState, useCallback, useMemo, useEffect } from 'react'
import { submitStill, normHandle, isValidHandle } from './api/still.js'
import { makeColors } from './components/ui.jsx'
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
const STORE = 'celeste:v1'
const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://dolbomi.app'

const OPENERS = [
  "there's a website that tells you if your ex still thinks about you and i've been staring at it for an hour",
  "you both have to enter each other's @. so if it's one-sided… they never know you looked 👀",
  "this only works if we ALL make it go viral — your ex won't show up unless it reaches them 🙏",
]

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
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ screen, email, me, them, sealedAt, matched }))
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [screen, email, me, them, sealedAt, matched])

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
    go('sendoff')
    const minSuspense = new Promise((r) => setTimeout(r, 3200))
    try {
      const [res] = await Promise.all([submitStill({ me, ex: them, email }), minSuspense])
      if (res?.error === 'rate_limited') {
        setError('Whoa — slow down. Too many checks in a short time. Try again in a little while.')
        go('them')
        return
      }
      const isMatch = !!res?.matched
      setMatched(isMatch)
      go(isMatch ? 'match' : 'resting')
    } catch (e) {
      console.error(e)
      setMatched(false)
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

  const share = useCallback(async () => {
    const text = OPENERS[Math.floor(Math.random() * OPENERS.length)]
    const payload = { title: 'CELESTE', text, url: SITE }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return false // native sheet handled it; no "copied" confirmation needed
      }
    } catch {
      /* user dismissed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${SITE}`)
      return true
    } catch {
      return false
    }
  }, [])

  const openConversation = useCallback(() => {
    const handle = normHandle(them)
    if (handle) window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer')
  }, [them])

  const screenT = { motion: MOTION, head: HEAD }
  const ctx = { email, me, them, sealedAt, matched, error, setEmail, setMe, setThem, go, seal, checkAnother, share, openConversation }
  const Screen = SCREENS[screen] || SCREENS.landing

  return (
    <div className="still-app">
      <div key={screen} className="fade" data-screen={screen}>
        <Screen C={C} t={screenT} ctx={ctx} />
      </div>
    </div>
  )
}
