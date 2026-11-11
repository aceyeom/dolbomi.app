// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LAMP                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// There is one light in the room and this file is it. It has a place in the
// window (x, y), a brightness, and a reach. Everything that looks lit reads
// those three and nothing else, so nothing in the room can be lit from two
// directions.
//
// Where it is:
//   pointer   under a mouse or a pen, as long as one is moving in the window
//   touch     under a finger, while it is down
//   focus     on whatever has the keyboard, once Tab has been used
//   rest      on the nearest thing marked `data-lamp-rest`, which is how the
//             room looks composed with nobody touching it, and on a phone
//
// It never jumps. It is carried: a critically damped spring takes it to
// where it is wanted, so it arrives without overshoot and can be turned
// round halfway there. With reduced motion asked for, it is simply put there.
//
// What it writes, once a frame and only when something changed:
//   the haze     one fixed element, the pool the lamp leaves on the wall
//   the shades   one per `Lit` region: the dark over that region, with the
//                lamp's hole cut in it at the lamp's place IN THAT REGION
//   subscribers  the hero's relief, which does its own arithmetic
//
// Each shade's two custom properties are set on the shade itself, which has
// no children, so a frame never restyles a subtree.

const STIFFNESS = 90 // 1/s², how hard the lamp is pulled to where it is wanted
const DAMPING = 2 * Math.sqrt(STIFFNESS) // critical: no overshoot
const SETTLE = 0.05 // px and px/s under which it is taken to have arrived
const TOUCH_LINGER = 1100 // ms the lamp stays where a finger left it

const reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }

const s = {
  x: 0, y: 0, vx: 0, vy: 0,
  tx: 0, ty: 0,
  level: 0, levelTo: 0, // the lamp itself coming up, 0 to 1
  duck: 0, duckTo: 0, // how far a work's own light pushes it down, 0 to 1
  radius: 520,
  mode: 'rest',
  placed: false,
  keyboard: false,
  focusEl: null,
  touchUntil: 0,
  w: 0, h: 0,
}

let haze = null
const shades = new Map() // region element -> { shade, seen, x, y }
const subscribers = new Set()
let io = null
let raf = 0
let last = 0
let dirty = true
let started = false

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function measure() {
  s.w = window.innerWidth
  s.h = window.innerHeight
  // the reach: most of a phone's width, a third of a desk's
  s.radius = clamp(Math.max(s.w, s.h) * 0.44, 300, 660)
  document.documentElement.style.setProperty('--lamp-r', `${Math.round(s.radius)}px`)
}

// The thing the lamp rests on: of everything marked, the one nearest the
// middle of the window. Its mark may say where on it, as two fractions.
function restPoint() {
  const marks = document.querySelectorAll('[data-lamp-rest]')
  let best = null
  let bestD = Infinity
  const mid = s.h * 0.5
  for (const el of marks) {
    const r = el.getBoundingClientRect()
    if (r.bottom < -s.h * 0.2 || r.top > s.h * 1.2 || (r.width === 0 && r.height === 0)) continue
    const [fx, fy] = (el.dataset.lampRest || '').split(/\s+/).map(Number)
    const px = r.left + r.width * (Number.isFinite(fx) ? fx : 0.5)
    const py = r.top + r.height * (Number.isFinite(fy) ? fy : 0.5)
    const d = Math.abs(py - mid)
    if (d < bestD) { bestD = d; best = [px, py] }
  }
  if (!best) return [s.w * 0.36, s.h * 0.4]
  return [clamp(best[0], s.w * 0.08, s.w * 0.92), clamp(best[1], s.h * 0.14, s.h * 0.86)]
}

function want() {
  if (s.mode === 'touch' && performance.now() > s.touchUntil) s.mode = 'rest'
  if (s.mode === 'focus') {
    const el = s.focusEl
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect()
      s.tx = clamp(r.left + r.width / 2, 0, s.w)
      s.ty = clamp(r.top + r.height / 2, 0, s.h)
      return
    }
    s.mode = 'rest'
  }
  if (s.mode === 'rest') [s.tx, s.ty] = restPoint()
}

function write() {
  const light = s.level * (1 - 0.55 * s.duck)
  if (haze) {
    haze.style.setProperty('--x', `${s.x.toFixed(1)}px`)
    haze.style.setProperty('--y', `${s.y.toFixed(1)}px`)
    haze.style.opacity = light.toFixed(3)
  }
  // read every box, then write every shade
  const jobs = []
  for (const [el, rec] of shades) {
    if (!rec.seen) continue
    const r = el.getBoundingClientRect()
    const x = s.x - r.left
    const y = s.y - r.top
    // (a shade that has never been placed has no place to compare with)
    if (!(Math.abs(x - rec.x) <= 0.25 && Math.abs(y - rec.y) <= 0.25)) jobs.push([rec, x, y])
  }
  for (const [rec, x, y] of jobs) {
    rec.x = x
    rec.y = y
    rec.shade.style.setProperty('--x', `${x.toFixed(1)}px`)
    rec.shade.style.setProperty('--y', `${y.toFixed(1)}px`)
  }
  const frame = { x: s.x, y: s.y, light, radius: s.radius }
  for (const fn of subscribers) fn(frame)
}

function tick(now) {
  raf = 0
  const dt = Math.min(0.05, (now - (last || now)) / 1000) || 0.016
  last = now
  want()

  let moving = false
  if (!s.placed || reduce.matches) {
    s.x = s.tx; s.y = s.ty; s.vx = 0; s.vy = 0; s.placed = true
  } else {
    // semi-implicit Euler on a critically damped spring
    const ax = STIFFNESS * (s.tx - s.x) - DAMPING * s.vx
    const ay = STIFFNESS * (s.ty - s.y) - DAMPING * s.vy
    s.vx += ax * dt; s.vy += ay * dt
    s.x += s.vx * dt; s.y += s.vy * dt
    moving = Math.abs(s.tx - s.x) > SETTLE || Math.abs(s.ty - s.y) > SETTLE || Math.abs(s.vx) > SETTLE || Math.abs(s.vy) > SETTLE
    if (!moving) { s.x = s.tx; s.y = s.ty; s.vx = 0; s.vy = 0 }
  }

  // the two brightnesses ease on their own clocks: the lamp comes up slowly
  // and a work's light takes over a little faster
  const ease = (v, to, rate) => {
    if (reduce.matches) return to
    const n = v + (to - v) * (1 - Math.exp(-rate * dt))
    return Math.abs(to - n) < 0.002 ? to : n
  }
  const level = ease(s.level, s.levelTo, 2.2)
  const duck = ease(s.duck, s.duckTo, 4.5)
  const fading = level !== s.level || duck !== s.duck
  s.level = level; s.duck = duck

  write()
  dirty = false
  if (moving || fading || s.mode === 'touch') wake()
}

function wake() {
  if (!raf && started) raf = requestAnimationFrame(tick)
}
function touch() {
  dirty = true
  wake()
}

// ── what moves it ──
function onPointerMove(e) {
  if (e.pointerType === 'touch') return
  s.mode = 'pointer'
  s.keyboard = false
  s.tx = e.clientX
  s.ty = e.clientY
  touch()
}
function onPointerGone(e) {
  // the mouse left the window: the lamp goes back to what it rests on
  if (e.pointerType === 'touch') return
  if (e.relatedTarget == null) { s.mode = 'rest'; touch() }
}
function onTouch(e) {
  const t = e.touches[0]
  if (!t) return
  s.mode = 'touch'
  s.keyboard = false
  s.tx = t.clientX
  s.ty = t.clientY
  s.touchUntil = performance.now() + 60000
  touch()
}
function onTouchEnd() {
  s.touchUntil = performance.now() + TOUCH_LINGER
  touch()
}
function onKey(e) {
  if (e.key === 'Tab') s.keyboard = true
}
function onFocus(e) {
  if (!s.keyboard || !(e.target instanceof Element)) return
  s.mode = 'focus'
  s.focusEl = e.target
  touch()
}

// ── the public face ──
export const lamp = {
  start() {
    if (started || typeof window === 'undefined') return
    started = true
    measure()
    io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const rec = shades.get(en.target)
        if (rec) rec.seen = en.isIntersecting
      }
      touch()
    }, { rootMargin: '25% 0px' })
    for (const el of shades.keys()) io.observe(el)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerGone, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey, { passive: true })
    window.addEventListener('focusin', onFocus, { passive: true })
    window.addEventListener('scroll', touch, { passive: true })
    window.addEventListener('resize', () => { measure(); touch() }, { passive: true })
    touch()
  },

  /** The lamp comes up. Called once the faces are in, so the first thing lit is the real page. */
  light() {
    s.levelTo = 1
    touch()
  },

  /** A work turns its own light on (0 to 1) and the lamp gives way to it: one bright thing at a time. */
  duck(amount) {
    s.duckTo = clamp(amount, 0, 1)
    touch()
  },

  setHaze(el) {
    haze = el
    touch()
  },

  addShade(region, shade) {
    const rec = { shade, seen: true, x: NaN, y: NaN }
    shades.set(region, rec)
    if (io) io.observe(region)
    touch()
    return () => {
      shades.delete(region)
      if (io) io.unobserve(region)
    }
  },

  subscribe(fn) {
    subscribers.add(fn)
    touch()
    return () => subscribers.delete(fn)
  },

  /** Something moved under the lamp without a scroll or a resize (a layout change). */
  refresh: touch,

  get state() { return s },
}
