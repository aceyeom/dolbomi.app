// galaxy.js — a real 3D perspective-projected particle galaxy for CELESTE.
// Stars live in 3D disk coordinates, spin around the galactic axis, and are
// projected through a perspective camera that the viewer can subtly steer with
// the pointer (or device tilt) — so the field has genuine depth and parallax,
// not a flat 2D swirl. Dependency-free (hand-rolled canvas math, no three.js).
//
// Modes: 'idle' (slow orbit), 'sendoff' (your star flies out into the disk),
//        'resting' (one calm star near the camera), 'match' (two stars converge
//        into a glowing burst and stay joined).
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function makeGlow(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.95)`)
  grd.addColorStop(0.3, `rgba(${r},${g},${b},0.42)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  return s
}
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const COL = { cream: '#EFEAF2', warm: '#F6D9C4', cool: '#CBD8F2' }

// camera / projection
const CAM = 2.7 // camera distance from galactic center
const FOCAL = 2.35 // focal length (bigger = flatter / less perspective)
const TILT = 1.04 // base disk tilt toward the camera (rad)
const GOLDEN = 2.39996323 // golden angle — even, non-repeating slot placement

export class GalaxyField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.opts = opts
    this.you = opts.you || '#FF8C66'
    this.them = opts.them || '#FF5E8A'
    this.motion = opts.motion != null ? opts.motion : 20
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.spin = 0
    this.t = 0
    this.mode = 'idle'
    this.modeT = 0
    this.lastTs = 0
    this.dim = 1
    this.dimTarget = 1
    this.running = false
    // pointer / tilt parallax — target vs. smoothed current
    this.pTarget = { x: 0, y: 0 }
    this.p = { x: 0, y: 0 }
    this.glows = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), warm: makeGlow('#FFE0C2', 64), white: makeGlow('#FFFFFF', 64) }
    const count = opts.count || (window.innerWidth < 540 ? 1300 : 2200)
    this._gen(count)
    this.trail = []
    this.burst = null
    // Each sealed person becomes a persistent star resting in the disk; the set
    // stacks across the session so "more people → more stars".
    this.sealed = []
    this._bind()
    this.resize()
  }

  _gen(n) {
    const arms = 2,
      spiral = 3.0
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    // Spiral-arm stars on a disk (x–z plane) with vertical thickness (y),
    // fatter through the central bulge.
    this.stars = []
    for (let i = 0; i < n; i++) {
      const r = Math.pow(rnd(), 0.6)
      const arm = Math.floor(rnd() * arms)
      const spread = (1 - r) * 0.5 + 0.05
      const ang = arm * ((Math.PI * 2) / arms) + r * spiral + (rnd() - 0.5) * spread * Math.PI
      const cr = rnd()
      const hue = cr < 0.8 ? COL.cream : cr < 0.91 ? COL.warm : COL.cool
      const glow = rnd() < 0.05
      this.stars.push({
        px: Math.cos(ang) * r,
        pz: Math.sin(ang) * r,
        py: (rnd() - 0.5) * (0.05 + 0.16 * (1 - r)),
        r,
        rad: glow ? 1.0 + rnd() * 1.2 : 0.5 + rnd() * 0.9,
        base: (0.34 + rnd() * 0.5) * (1 - r * 0.22),
        hue,
        glow,
        tw: rnd() * 6.28,
        tws: glow ? 0.5 + rnd() : 0.15 + rnd() * 0.5,
      })
    }
    // Foreground dust in a larger volume — gives strong near-field parallax.
    this.dust = []
    const dn = Math.floor(n * 0.5)
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        px: (rnd() - 0.5) * 4.2,
        py: (rnd() - 0.5) * 2.6,
        pz: (rnd() - 0.5) * 4.2,
        rad: 0.4 + rnd() * 0.9,
        base: 0.08 + rnd() * 0.26,
        tw: rnd() * 6.28,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }
  }

  _bind() {
    this._onResize = () => this.resize()
    this._onPointer = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      this.pTarget.x = clamp(x, -1, 1)
      this.pTarget.y = clamp(y, -1, 1)
    }
    this._onTilt = (e) => {
      if (e.gamma == null && e.beta == null) return
      this.pTarget.x = clamp((e.gamma || 0) / 35, -1, 1)
      this.pTarget.y = clamp(((e.beta || 0) - 45) / 35, -1, 1)
    }
    window.addEventListener('resize', this._onResize)
    window.addEventListener('pointermove', this._onPointer, { passive: true })
    window.addEventListener('deviceorientation', this._onTilt, { passive: true })
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.w = rect.width || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || window.innerWidth || 402
    this.h = rect.height || window.innerHeight || 700
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    // Spread the field so the disk spills past the frame on wide monitors as
    // well as tall phones — it should read as a window into a much bigger space,
    // not a single contained shape. (Star pixel sizes don't scale with unit, so
    // this widens the field rather than zooming it.)
    this.unit = Math.min(this.w, this.h) * 0.82 + Math.max(this.w, this.h) * 0.06
    this.cx = this.w / 2
    this.cy = this.h * 0.44
  }

  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    if (changed) this.modeT = 0
    if (mode === 'idle') this.dimTarget = data.dim != null ? data.dim : 1
    if (mode === 'sendoff') {
      this.dimTarget = 0.62
      if (changed) this.trail = []
    }
    if (mode === 'resting') this.dimTarget = 0.22
    if (mode === 'match') {
      this.dimTarget = 0.16
      if (changed) this.burst = null
    }
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTs = performance.now()
    requestAnimationFrame(this._tick.bind(this))
  }
  stop() {
    this.running = false
  }
  destroy() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
    window.removeEventListener('pointermove', this._onPointer)
    window.removeEventListener('deviceorientation', this._onTilt)
  }
  setMotion(m) {
    this.motion = m
  }
  setPalette(you, them) {
    this.you = you
    this.them = them
    this.glows.you = makeGlow(you, 64)
    this.glows.them = makeGlow(them, 64)
  }

  // Match the resting set to the number of people sealed. Growing is the common
  // case (each seal adds a star); it can also shrink by one when a send-off
  // fails and the app rolls the count back, so the failed star doesn't linger.
  // Slots are a pure function of index, so trimming the tail is stable.
  setSeals(n) {
    while (this.sealed.length < n) {
      const i = this.sealed.length
      const ring = i % 3
      this.sealed.push({
        theta0: i * GOLDEN, // disk angle; galaxy spin orbits it for free
        r: 0.34 + ring * 0.15, // staggered radii so they sit at different depths
        y: (i % 2 ? 1 : -1) * (0.045 + ring * 0.02), // above / below the plane
        phase: i * 1.7, // desynced twinkle
      })
    }
    if (this.sealed.length > n) this.sealed.length = Math.max(0, n)
  }

  // Rotate a local point into view space (spin → parallax yaw → tilt), then
  // perspective-project. Returns null when behind the camera.
  _project(px, py, pz, rot) {
    // spin about galactic (y) axis
    let x = px * rot.cosS + pz * rot.sinS
    let z = -px * rot.sinS + pz * rot.cosS
    let y = py
    // parallax yaw about y
    const x2 = x * rot.cosY + z * rot.sinY
    const z2 = -x * rot.sinY + z * rot.cosY
    x = x2
    z = z2
    // tilt about x
    const y3 = y * rot.cosT - z * rot.sinT
    const z3 = y * rot.sinT + z * rot.cosT
    y = y3
    z = z3
    const zc = CAM + z
    if (zc <= 0.05) return null
    const persp = FOCAL / zc
    return {
      sx: this.cx + x * this.unit * persp,
      sy: this.cy + y * this.unit * persp,
      persp,
      zc,
      // nearer → brighter & bigger
      shade: clamp((CAM + 1.1 - zc) / 2.0 + 0.45, 0.35, 1.25),
    }
  }

  _rot() {
    // auto-drift keeps the camera alive without any input; pointer steers it.
    const driftY = Math.sin(this.t * 0.12) * 0.07
    const yaw = this.p.x * 0.32 + driftY
    const tilt = TILT + this.p.y * 0.2 + Math.sin(this.t * 0.09) * 0.025
    return {
      cosS: Math.cos(this.spin),
      sinS: Math.sin(this.spin),
      cosY: Math.cos(yaw),
      sinY: Math.sin(yaw),
      cosT: Math.cos(tilt),
      sinT: Math.sin(tilt),
    }
  }

  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.t += dt
    this.modeT += dt
    this.spin += dt * (this.motion / 100) * 0.16
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2.2)
    this.p.x = lerp(this.p.x, this.pTarget.x, Math.min(1, dt * 2.6))
    this.p.y = lerp(this.p.y, this.pTarget.y, Math.min(1, dt * 2.6))
    this._draw(dt)
    requestAnimationFrame(this._tick.bind(this))
  }

  _draw(dt) {
    const ctx = this.ctx,
      d = this.dim,
      rot = this._rot()

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#050309'
    ctx.fillRect(0, 0, this.w, this.h)

    // projected galactic core → anchor for the core glow + hero events
    const o = this._project(0, 0, 0, rot) || { sx: this.cx, sy: this.cy, persp: 1 }
    this.ox = o.sx
    this.oy = o.sy

    // soft core glow (additive)
    ctx.globalCompositeOperation = 'lighter'
    const coreR = this.unit * 0.5 * o.persp
    const cg = ctx.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, coreR)
    cg.addColorStop(0, `rgba(255,206,168,${0.16 * d})`)
    cg.addColorStop(0.45, `rgba(214,150,120,${0.05 * d})`)
    cg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = cg
    ctx.fillRect(0, 0, this.w, this.h)

    // foreground dust (source-over, twinkling) — strong parallax
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.dust) {
      const pr = this._project(p.px, p.py, p.pz, rot)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      p.tw += dt * p.tws
      const a = p.base * (0.7 + 0.3 * Math.sin(p.tw)) * d * clamp(pr.shade, 0.3, 1.2)
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.6, a)
      ctx.fillStyle = p.warm ? COL.warm : COL.cream
      const s = p.rad * pr.persp
      ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
    }

    // arm stars (crisp) + collect glow stars for the additive pass
    const glowQ = []
    for (const st of this.stars) {
      const pr = this._project(st.px, st.py, st.pz, rot)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      st.tw += dt * st.tws
      const a = st.base * (0.7 + 0.3 * Math.sin(st.tw)) * d * pr.shade
      if (st.glow) glowQ.push([pr, st, a])
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.85, a)
      ctx.fillStyle = st.hue
      const s = Math.max(0.4, st.rad * pr.persp * 0.9)
      ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
    }

    // glow pass (additive, small + few)
    ctx.globalCompositeOperation = 'lighter'
    for (const [pr, st, a] of glowQ) {
      const g = st.hue === COL.cool ? this.glows.them : st.hue === COL.warm ? this.glows.you : this.glows.warm
      const sz = st.rad * 7 * pr.persp
      ctx.globalAlpha = Math.min(0.55, a * 0.7)
      ctx.drawImage(g, pr.sx - sz / 2, pr.sy - sz / 2, sz, sz)
    }

    this._drawHero(dt, rot)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  _star(x, y, color, coreR, glowR, glowA) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = glowA
    ctx.drawImage(this.glows[color], x - glowR, y - glowR, glowR * 2, glowR * 2)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, coreR, 0, 6.2832)
    ctx.fill()
  }

  _drawHero(dt, rot) {
    if (this.mode === 'match') {
      this._drawMatch(dt)
      return
    }
    // sendoff flies the newest star into place; every other mode just rests the
    // whole stacked set so it survives the screen change without a cut.
    const flying = this.mode === 'sendoff'
    this._drawSealed(rot, flying)
    if (flying) this._drawFlyIn(rot)
  }

  // Position of a sealed star in 3D disk space. _project applies the galaxy
  // spin, so each one quietly orbits the core and shares the field's parallax.
  _sealedAt(s, rot) {
    return this._project(Math.cos(s.theta0) * s.r, s.y, Math.sin(s.theta0) * s.r, rot)
  }

  _drawSealed(rot, excludeLast) {
    const n = this.sealed.length
    for (let i = 0; i < n; i++) {
      if (excludeLast && i === n - 1) continue
      const pr = this._sealedAt(this.sealed[i], rot)
      if (!pr) continue
      const pulse = 0.78 + 0.22 * Math.sin(this.t * 1.3 + this.sealed[i].phase)
      const sh = clamp(pr.shade, 0.45, 1.2)
      this._star(pr.sx, pr.sy, 'you', Math.max(1.1, 1.9 * pr.persp), 12 * pr.persp * pulse, 0.5 * pulse * sh)
    }
  }

  _drawFlyIn(rot) {
    const s = this.sealed[this.sealed.length - 1]
    if (!s) return
    const ctx = this.ctx
    const D = 1.9,
      e = easeOut(Math.min(1, this.modeT / D))
    const pr = this._sealedAt(s, rot)
    const tx = pr ? pr.sx : this.ox,
      ty = pr ? pr.sy : this.oy
    const sx0 = this.cx,
      sy0 = this.h * 0.72
    const mx = (sx0 + tx) / 2 + (ty - sy0) * 0.28
    const my = (sy0 + ty) / 2 - (tx - sx0) * 0.28
    const x = (1 - e) * (1 - e) * sx0 + 2 * (1 - e) * e * mx + e * e * tx
    const y = (1 - e) * (1 - e) * sy0 + 2 * (1 - e) * e * my + e * e * ty
    this.trail.push([x, y])
    if (this.trail.length > 26) this.trail.shift()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < this.trail.length; i++) {
      const tp = this.trail[i],
        f = i / this.trail.length,
        ta = f * 0.34 * (1 - e * 0.45)
      const sz = 3 + f * 8
      ctx.globalAlpha = ta
      ctx.drawImage(this.glows.you, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
    }
    // hand off seamlessly: at e=1 this matches the resting size in _drawSealed
    this._star(x, y, 'you', 2.4 - e * 0.6, 16 - e * 4, 0.62)
  }

  // Two stars sweep in from opposite sides, meet at the core in a glowing
  // burst, then stay joined — a bright merged core with the two colored stars
  // orbiting it and a soft filament between them.
  _drawMatch(dt) {
    const ctx = this.ctx
    const t = this.modeT
    const cx = this.ox,
      cy = this.oy
    const APPROACH = 1.5
    const e = easeInOut(Math.min(1, t / APPROACH))
    const startGap = this.unit * 0.62
    const gap = startGap * (1 - e)
    const arc = Math.sin((1 - e) * Math.PI) * this.unit * 0.12 // bow as they sweep in
    const xA = cx - gap,
      yA = cy - arc
    const xB = cx + gap,
      yB = cy + arc

    ctx.globalCompositeOperation = 'lighter'

    // connecting filament once they're close
    if (e > 0.55) {
      const fa = (e - 0.55) / 0.45
      const lg = ctx.createLinearGradient(xA, yA, xB, yB)
      lg.addColorStop(0, this._rgba(this.you, 0))
      lg.addColorStop(0.5, `rgba(255,236,222,${0.5 * fa})`)
      lg.addColorStop(1, this._rgba(this.them, 0))
      ctx.strokeStyle = lg
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(xA, yA)
      ctx.lineTo(xB, yB)
      ctx.stroke()
    }

    if (t < APPROACH) {
      // sweeping in, with motion trails
      this._heroTrail(xA, yA, 'you', 0.4)
      this._heroTrail(xB, yB, 'them', 0.4)
      this._star(xA, yA, 'you', 2.2, 16, 0.55)
      this._star(xB, yB, 'them', 2.2, 16, 0.55)
      return
    }

    // ── meeting burst (fires once) ──
    if (!this.burst) {
      this.burst = []
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3
        const sp = this.unit * (0.18 + Math.random() * 0.32)
        this.burst.push({ a, sp, col: i % 2 ? this.them : this.you, life: 0.9 + Math.random() * 0.5 })
      }
    }
    const bt = t - APPROACH

    // radial flash
    const flash = Math.exp(-bt * 3.2)
    if (flash > 0.01) {
      const fr = this.unit * (0.2 + bt * 0.9)
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr)
      fg.addColorStop(0, `rgba(255,240,228,${0.9 * flash})`)
      fg.addColorStop(0.4, `${this._rgba(this.you, 0.5 * flash)}`)
      fg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, this.w, this.h)
    }

    // shockwave rings
    for (let k = 0; k < 2; k++) {
      const rt = bt - k * 0.18
      if (rt > 0 && rt < 1.1) {
        const rr = this.unit * (0.1 + rt * 0.95)
        ctx.globalAlpha = clamp(0.5 * (1 - rt / 1.1), 0, 0.5)
        ctx.strokeStyle = k ? this._rgba(this.them, 1) : this._rgba(this.you, 1)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, 6.2832)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // sparks flying out
    for (const sp of this.burst) {
      const f = Math.min(1, bt / sp.life)
      if (f >= 1) continue
      const dist = sp.sp * easeOut(f)
      const x = cx + Math.cos(sp.a) * dist
      const y = cy + Math.sin(sp.a) * dist * 0.8
      const a = (1 - f) * 0.8
      const sz = 4 + (1 - f) * 5
      ctx.globalAlpha = a
      ctx.drawImage(sp.col === this.you ? this.glows.you : this.glows.them, x - sz, y - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1

    // merged core: bright white star + breathing halo
    const breathe = 1 + 0.12 * Math.sin(t * 2.0)
    this._star(cx, cy, 'white', 2.6 * breathe, 22 * breathe, 0.5)
    this._star(cx, cy, 'you', 0.1, 30 * breathe, 0.18)

    // the two stars now orbit the joined core (you + them, gently)
    const orbR = this.unit * 0.05 * (1 + 0.1 * Math.sin(t))
    const oa = t * 0.9
    this._star(cx + Math.cos(oa) * orbR, cy + Math.sin(oa) * orbR * 0.8, 'you', 1.6, 11, 0.5)
    this._star(cx + Math.cos(oa + Math.PI) * orbR, cy + Math.sin(oa + Math.PI) * orbR * 0.8, 'them', 1.6, 11, 0.5)
  }

  _heroTrail(x, y, color, alpha) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = alpha * 0.4
    ctx.drawImage(this.glows[color], x - 14, y - 14, 28, 28)
    ctx.globalAlpha = 1
  }

  _rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
  }
}
