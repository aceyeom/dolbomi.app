// galaxy.js — a real 3D perspective-projected particle galaxy for CELESTE.
// Stars live in 3D coordinates, spin around the galactic axis, and are projected
// through a perspective camera that the viewer can subtly steer with the pointer
// (or device tilt) — so the field has genuine depth and parallax, not a flat 2D
// swirl. Dependency-free (hand-rolled canvas math, no three.js).
//
// The field is built from layered populations so it dissolves into space instead
// of reading as one contained shape: a bright spheroidal core bulge, an
// exponential-falloff disk whose feathered spiral arms have no hard rim, scattered
// inter-arm + halo stars, soft drifting nebula gas, and a full-frame deep
// background starfield behind everything.
//
// Modes: 'idle' (slow orbit), 'sendoff' (your star coalesces where the @ became a
//        star, then drifts into its place), 'resting' (the stacked set rests in
//        the disk), 'match' (two stars drift together into a calm glowing binary).
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
const smooth = (p) => p * p * (3 - 2 * p)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t

// Stellar palette — warm gold core, cream body, cool young arms, rare red giant.
const PAL = {
  gold: '#F6DCA9',
  cream: '#EFEAF2',
  warm: '#F4C9A1',
  blue: '#BFD3FA',
  ice: '#A7C2FF',
  red: '#F3A98A',
}

// camera / projection
const CAM = 2.7 // camera distance from galactic center
const FOCAL = 2.35 // focal length (bigger = flatter / less perspective)
const TILT = 1.04 // base disk tilt toward the camera (rad)
const TWO = Math.PI * 2

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
    this._glowCache = {}
    const count = opts.count || (window.innerWidth < 540 ? 1500 : 2400)
    this._gen(count)
    this.trail = []
    this.motes = null
    // where the @ became a star (normalized 0..1 screen coords) — the send-off
    // drift starts here so it continues straight out of the DOM morph.
    this.origin = null
    // live screen position of the star we're "listening" for, so a subtle DOM
    // tag can follow it. { x, y, vis }
    this.primaryScreen = { x: 0, y: 0, vis: false }
    // Each sealed person becomes a persistent star resting in the disk; the set
    // stacks across the session so "more people → more stars".
    this.sealed = []
    this._bind()
    this.resize()
  }

  // Tinted glow texture cache so arm/bulge glow stars can each carry their own hue.
  _glowFor(hex) {
    if (!this._glowCache[hex]) this._glowCache[hex] = makeGlow(hex, 64)
    return this._glowCache[hex]
  }

  _gen(n) {
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    // cheap approx-normal in ~[-1,1]
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

    this.stars = []
    const push = (px, py, pz, r, base, hue, glow) => {
      this.stars.push({
        px,
        py,
        pz,
        r,
        rad: glow ? 1.1 + rnd() * 1.3 : 0.45 + rnd() * 0.85,
        base,
        hue,
        glow,
        tw: rnd() * TWO,
        tws: glow ? 0.5 + rnd() : 0.15 + rnd() * 0.5,
      })
    }

    // 1 · BULGE — bright, dense, slightly-flattened spheroid at the core.
    const nb = Math.floor(n * 0.2)
    for (let i = 0; i < nb; i++) {
      const rr = Math.pow(rnd(), 1.9) * 0.3
      const u = rnd() * TWO
      const v = rnd() * 2 - 1
      const ringr = Math.sqrt(1 - v * v)
      const cr = rnd()
      const hue = cr < 0.6 ? PAL.gold : cr < 0.85 ? PAL.warm : PAL.cream
      push(rr * ringr * Math.cos(u), rr * v * 0.7, rr * ringr * Math.sin(u), rr, 0.5 + rnd() * 0.5, hue, rnd() < 0.1)
    }

    // 2 · DISK — exponential radial falloff (no hard edge) on two feathered
    // spiral arms, with a chunk of inter-arm field stars so it never reads as two
    // painted stripes. Arms widen and bluen outward; the plane is thin.
    const ARMS = 2
    const TWIST = 2.6
    const nd = Math.floor(n * 0.62)
    for (let i = 0; i < nd; i++) {
      let r = -0.34 * Math.log(1 - rnd() * 0.992) // exponential disk
      if (r > 1.9) r = 1.9 - rnd() * 0.3 // fold the rare long tail back in
      const onArm = rnd() < 0.7
      let ang
      if (onArm) {
        const arm = Math.floor(rnd() * ARMS)
        ang = arm * (TWO / ARMS) + r * TWIST + gauss() * (0.17 + r * 0.16)
      } else {
        ang = rnd() * TWO
      }
      const thick = 0.018 + 0.05 * Math.exp(-r * 2.2) // thin disk, fatter inward
      const cr = rnd()
      let hue
      if (r < 0.35) hue = cr < 0.5 ? PAL.gold : PAL.cream
      else if (r < 0.9) hue = cr < 0.16 ? PAL.warm : cr < 0.82 ? PAL.cream : PAL.blue
      else hue = cr < 0.5 ? PAL.blue : cr < 0.6 ? PAL.ice : PAL.cream
      if (cr > 0.986) hue = PAL.red
      const base = (0.3 + rnd() * 0.5) * (onArm ? 1 : 0.68) * (1 - r * 0.16)
      push(Math.cos(ang) * r, gauss() * thick, Math.sin(ang) * r, r, base, hue, rnd() < 0.045)
    }

    // 3 · HALO — sparse faint stars in a big flattened spheroid. Fills the space
    // around the disk so the galaxy bleeds into the void instead of being cut out.
    const nh = n - this.stars.length
    for (let i = 0; i < nh; i++) {
      const rr = 0.5 + Math.pow(rnd(), 0.6) * 1.9
      const u = rnd() * TWO
      const v = rnd() * 2 - 1
      const ringr = Math.sqrt(1 - v * v)
      push(rr * ringr * Math.cos(u), rr * v * 0.45, rr * ringr * Math.sin(u), rr, 0.1 + rnd() * 0.17, rnd() < 0.3 ? PAL.blue : PAL.cream, false)
    }

    // Foreground dust — large volume, strong near-field parallax (kept, softened).
    this.dust = []
    const dn = Math.floor(n * 0.42)
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        px: (rnd() - 0.5) * 4.4,
        py: (rnd() - 0.5) * 2.8,
        pz: (rnd() - 0.5) * 4.4,
        rad: 0.4 + rnd() * 0.9,
        base: 0.06 + rnd() * 0.22,
        tw: rnd() * TWO,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }

    // Nebula — soft colored gas clouds living in the disk; depth + space vibe.
    this.nebula = []
    const NCOL = [PAL.blue, '#7E6BA8', '#C77E8A', PAL.warm, '#5E7BB0']
    for (let i = 0; i < 13; i++) {
      const r = 0.2 + rnd() * 1.05
      const a = rnd() * TWO
      this.nebula.push({
        px: Math.cos(a) * r,
        py: gauss() * 0.12,
        pz: Math.sin(a) * r,
        rad: 0.34 + rnd() * 0.55,
        col: NCOL[Math.floor(rnd() * NCOL.length)],
        a: 0.045 + rnd() * 0.06,
        tw: rnd() * TWO,
        tws: 0.05 + rnd() * 0.12,
      })
    }

    // Deep background starfield — screen-space, fills the whole frame so the scene
    // reads as a window into space, not a shape on black. Subtle parallax + twinkle.
    this.bg = []
    const bn = window.innerWidth < 540 ? 240 : 440
    for (let i = 0; i < bn; i++) {
      this.bg.push({
        x: rnd(),
        y: rnd(),
        z: 0.3 + rnd() * 0.7, // parallax depth (smaller = nearer = moves more)
        rad: rnd() < 0.92 ? 0.5 + rnd() * 0.7 : 1.0 + rnd() * 0.9,
        base: 0.12 + rnd() * 0.5,
        hue: rnd() < 0.15 ? PAL.blue : rnd() < 0.2 ? PAL.warm : '#FFFFFF',
        tw: rnd() * TWO,
        tws: 0.15 + rnd() * 0.7,
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
      this.dimTarget = 0.66
      if (data.origin) this.origin = data.origin
      if (changed) this.trail = []
    }
    if (mode === 'resting') this.dimTarget = 0.3
    if (mode === 'match') {
      this.dimTarget = 0.22
      if (changed) this.motes = null
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
        theta0: i * 2.39996323, // golden angle — even, non-repeating placement
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
    let x = px * rot.cosS + pz * rot.sinS
    let z = -px * rot.sinS + pz * rot.cosS
    let y = py
    const x2 = x * rot.cosY + z * rot.sinY
    const z2 = -x * rot.sinY + z * rot.cosY
    x = x2
    z = z2
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
      shade: clamp((CAM + 1.1 - zc) / 2.0 + 0.45, 0.35, 1.25),
    }
  }

  _rot() {
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

    // deep-space backdrop with a faint cool zenith glow
    ctx.globalCompositeOperation = 'source-over'
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.h)
    bgGrad.addColorStop(0, '#06050E')
    bgGrad.addColorStop(0.55, '#040309')
    bgGrad.addColorStop(1, '#030206')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.w, this.h)

    // full-frame background starfield (screen-space parallax + twinkle)
    this._drawBackground(dt, d)

    // projected galactic core → anchor for the core glow + hero events
    const o = this._project(0, 0, 0, rot) || { sx: this.cx, sy: this.cy, persp: 1 }
    this.ox = o.sx
    this.oy = o.sy

    // nebula gas (additive, behind the stars)
    this._drawNebula(dt, d, rot)

    // soft core glow (additive)
    ctx.globalCompositeOperation = 'lighter'
    const coreR = this.unit * 0.52 * o.persp
    const cg = ctx.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, coreR)
    cg.addColorStop(0, `rgba(255,214,176,${0.18 * d})`)
    cg.addColorStop(0.4, `rgba(214,150,120,${0.06 * d})`)
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
      ctx.fillStyle = p.warm ? PAL.warm : PAL.cream
      const s = p.rad * pr.persp
      ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
    }

    // arm/bulge/halo stars (crisp) + collect glow stars for the additive pass
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

    // glow pass (additive, small + few), each tinted to its star's hue
    ctx.globalCompositeOperation = 'lighter'
    for (const [pr, st, a] of glowQ) {
      const sz = st.rad * 7 * pr.persp
      ctx.globalAlpha = Math.min(0.55, a * 0.7)
      ctx.drawImage(this._glowFor(st.hue), pr.sx - sz / 2, pr.sy - sz / 2, sz, sz)
    }

    this._drawHero(dt, rot)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  _drawBackground(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    const px = this.p.x,
      py = this.p.y
    for (const b of this.bg) {
      b.tw += dt * b.tws
      const par = (1 - b.z) * 26
      const x = b.x * this.w - px * par
      const y = b.y * this.h - py * par
      if (x < -4 || x > this.w + 4 || y < -4 || y > this.h + 4) continue
      const a = b.base * (0.5 + 0.5 * Math.sin(b.tw)) * d
      if (a <= 0.01) continue
      ctx.globalAlpha = Math.min(0.8, a)
      ctx.fillStyle = b.hue
      const s = b.rad
      ctx.fillRect(x - s, y - s, s * 2, s * 2)
    }
  }

  _drawNebula(dt, d, rot) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const nb of this.nebula) {
      const pr = this._project(nb.px, nb.py, nb.pz, rot)
      if (!pr) continue
      nb.tw += dt * nb.tws
      const rr = nb.rad * this.unit * pr.persp
      if (rr < 5 || pr.sx < -rr || pr.sx > this.w + rr || pr.sy < -rr || pr.sy > this.h + rr) continue
      const a = nb.a * (0.7 + 0.3 * Math.sin(nb.tw)) * d * clamp(pr.shade, 0.4, 1.2)
      const g = ctx.createRadialGradient(pr.sx, pr.sy, 0, pr.sx, pr.sy, rr)
      g.addColorStop(0, this._rgba(nb.col, a))
      g.addColorStop(0.5, this._rgba(nb.col, a * 0.4))
      g.addColorStop(1, this._rgba(nb.col, 0))
      ctx.fillStyle = g
      ctx.fillRect(pr.sx - rr, pr.sy - rr, rr * 2, rr * 2)
    }
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
    ctx.arc(x, y, coreR, 0, TWO)
    ctx.fill()
  }

  _drawHero(dt, rot) {
    if (this.mode === 'match') {
      this._drawMatch(dt)
      return
    }
    // sendoff drifts the newest star into place; every other mode just rests the
    // whole stacked set so it survives the screen change without a cut.
    const flying = this.mode === 'sendoff'
    this._drawSealed(rot, flying)
    if (flying) this._drawFlyIn(rot)
    else if (this.sealed.length === 0) this.primaryScreen = { x: 0, y: 0, vis: false }
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
      // the newest resting star is the one we're listening for — let a tag follow it
      if (i === n - 1) this.primaryScreen = { x: pr.sx, y: pr.sy, vis: true }
    }
  }

  // The send-off: the star coalesces exactly where the @ became a star, then
  // drifts on a long, decelerating arc into its resting slot — settling, not
  // flashing. Hands off seamlessly to _drawSealed's resting size at the end.
  _drawFlyIn(rot) {
    const s = this.sealed[this.sealed.length - 1]
    if (!s) return
    const ctx = this.ctx
    const pr = this._sealedAt(s, rot)
    const tx = pr ? pr.sx : this.ox,
      ty = pr ? pr.sy : this.oy
    const ox = this.origin ? this.origin.x * this.w : this.cx
    const oy = this.origin ? this.origin.y * this.h : this.h * 0.43

    const COAL = 0.6,
      DRIFT = 2.7
    const tt = this.modeT

    // phase 1 — coalesce: the star gathers and brightens at the origin point
    if (tt < COAL) {
      const f = smooth(tt / COAL)
      // a faint halo contracting into the forming point
      ctx.globalCompositeOperation = 'lighter'
      const hr = 26 * (1 - f) + 9
      ctx.globalAlpha = 0.4 * f
      ctx.drawImage(this.glows.you, ox - hr, oy - hr, hr * 2, hr * 2)
      ctx.globalAlpha = 1
      this._star(ox, oy, 'you', 1.2 + 0.9 * f, 8 + 7 * f, 0.18 + 0.34 * f)
      this.primaryScreen = { x: ox, y: oy, vis: true }
      this.trail = []
      return
    }

    // phase 2 — drift: gentle S-curve, easeInOut so it departs and arrives slowly
    const e = easeInOut(Math.min(1, (tt - COAL) / DRIFT))
    const dx = tx - ox,
      dy = ty - oy
    const mx = (ox + tx) / 2 - dy * 0.16
    const my = (oy + ty) / 2 + dx * 0.16
    const x = (1 - e) * (1 - e) * ox + 2 * (1 - e) * e * mx + e * e * tx
    const y = (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * my + e * e * ty

    // soft drifting wake (additive, fading toward the tail)
    this.trail.push([x, y])
    if (this.trail.length > 32) this.trail.shift()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < this.trail.length; i++) {
      const tp = this.trail[i],
        f = i / this.trail.length
      ctx.globalAlpha = f * f * 0.26 * (1 - e * 0.5)
      const sz = 2 + f * 7
      ctx.drawImage(this.glows.you, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1

    this.primaryScreen = { x, y, vis: true }
    // size eases down to the resting size; a slow breath instead of a shine
    const breathe = 0.48 + 0.06 * Math.sin(this.t * 2)
    this._star(x, y, 'you', 1.9 + (1 - e) * 0.5, 14 - e * 2, breathe)
  }

  // MATCH — reworked to match the rest of the field's calm, drifting language:
  // two stars drift together along gentle arcs, meet in a soft bloom (no
  // shockwave, no shrapnel), then settle into a slow, breathing binary linked by
  // a luminous bridge, with a few motes drawn quietly inward.
  _drawMatch(dt) {
    const ctx = this.ctx
    const t = this.modeT
    // Stage the meeting in the open space below the headline + handle chips, so
    // the calm binary reads clearly instead of forming behind the text.
    const cx = this.cx
    const cy = this.h * 0.6
    this.primaryScreen = { x: cx, y: cy, vis: false }

    const APPROACH = 2.4
    const e = easeInOut(Math.min(1, t / APPROACH))
    const gap = this.unit * 0.5 * (1 - e)
    const arc = Math.sin((1 - e) * Math.PI) * this.unit * 0.1 // gentle bow, decays to 0
    const xA = cx - gap,
      yA = cy - arc
    const xB = cx + gap,
      yB = cy + arc

    ctx.globalCompositeOperation = 'lighter'

    // luminous bridge brightens as they near
    if (e > 0.32) {
      const fa = clamp((e - 0.32) / 0.68, 0, 1)
      const lg = ctx.createLinearGradient(xA, yA, xB, yB)
      lg.addColorStop(0, this._rgba(this.you, 0))
      lg.addColorStop(0.5, `rgba(255,238,224,${0.4 * fa})`)
      lg.addColorStop(1, this._rgba(this.them, 0))
      ctx.strokeStyle = lg
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(xA, yA)
      ctx.lineTo(xB, yB)
      ctx.stroke()
    }

    if (t < APPROACH) {
      this._heroGlow(xA, yA, 'you', 0.34)
      this._heroGlow(xB, yB, 'them', 0.34)
      this._star(xA, yA, 'you', 2.0, 14, 0.5)
      this._star(xB, yB, 'them', 2.0, 14, 0.5)
      return
    }

    const bt = t - APPROACH

    // a single soft bloom of light that swells then fades — the moment of meeting
    const bloom = Math.exp(-bt * 1.5) * (1 - Math.exp(-bt * 6))
    if (bloom > 0.008) {
      const fr = this.unit * (0.16 + bt * 0.12)
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr)
      fg.addColorStop(0, `rgba(255,244,232,${0.62 * bloom})`)
      fg.addColorStop(0.45, this._rgba(this.you, 0.3 * bloom))
      fg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, this.w, this.h)
    }

    // one slow, faint ring that expands once and dissolves (a ripple, not a shock)
    if (bt < 2.4) {
      const rt = easeOut(Math.min(1, bt / 2.4))
      const rr = this.unit * (0.06 + rt * 0.5)
      ctx.globalAlpha = clamp(0.3 * (1 - rt), 0, 0.3)
      ctx.strokeStyle = 'rgba(255,236,224,1)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, TWO)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // motes drift quietly inward then circle the pair — gentle inflow, no sparks
    if (!this.motes) {
      this.motes = []
      for (let i = 0; i < 14; i++) {
        this.motes.push({ a: Math.random() * TWO, r0: this.unit * (0.18 + Math.random() * 0.26), sp: 0.4 + Math.random() * 0.5, col: Math.random() < 0.5 ? 'you' : 'them', ph: Math.random() * TWO })
      }
    }
    for (const m of this.motes) {
      const settle = easeOut(clamp(bt / 2.2, 0, 1))
      const rr = m.r0 * (1 - 0.72 * settle) * (1 + 0.08 * Math.sin(t * m.sp + m.ph))
      const ang = m.a + t * m.sp * 0.5
      const x = cx + Math.cos(ang) * rr
      const y = cy + Math.sin(ang) * rr * 0.7
      ctx.globalAlpha = 0.32 * (0.6 + 0.4 * Math.sin(t * 1.5 + m.ph))
      ctx.drawImage(this.glows[m.col], x - 3, y - 3, 6, 6)
    }
    ctx.globalAlpha = 1

    // joined core: a still bright point inside a breathing halo
    const breathe = 1 + 0.1 * Math.sin(t * 1.6)
    this._star(cx, cy, 'warm', 0.1, 30 * breathe, 0.16)
    this._star(cx, cy, 'white', 2.3 * breathe, 19 * breathe, 0.5)

    // the two stars settle into a calm, close mutual orbit, linked by a soft bridge
    const orbR = this.unit * 0.045 * (1 + 0.08 * Math.sin(t * 0.8))
    const oa = t * 0.6
    const ax = cx + Math.cos(oa) * orbR,
      ay = cy + Math.sin(oa) * orbR * 0.7
    const bx = cx + Math.cos(oa + Math.PI) * orbR,
      by = cy + Math.sin(oa + Math.PI) * orbR * 0.7
    const lg2 = ctx.createLinearGradient(ax, ay, bx, by)
    lg2.addColorStop(0, this._rgba(this.you, 0.5))
    lg2.addColorStop(0.5, 'rgba(255,240,228,0.5)')
    lg2.addColorStop(1, this._rgba(this.them, 0.5))
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = lg2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    this._star(ax, ay, 'you', 1.5, 10, 0.5)
    this._star(bx, by, 'them', 1.5, 10, 0.5)
  }

  _heroGlow(x, y, color, alpha) {
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
