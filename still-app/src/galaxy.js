// galaxy.js — refined starfield for STILL. Exports the GalaxyField class.
// Crisp points (not blurry sprites), a full-frame dust layer so the whole screen
// reads as space, a subtle core, and only a few stars actually glow.
// Modes: 'idle' (swirl), 'sendoff' (your star flies in), 'resting' (one calm dot),
//        'match' (field dims, two linked stars).
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
  grd.addColorStop(0.32, `rgba(${r},${g},${b},0.40)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  return s
}
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const COL = { cream: '#EFEAF2', warm: '#F6D9C4', cool: '#CBD8F2' }

export class GalaxyField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.opts = opts
    this.you = opts.you || '#FF8C66'
    this.them = opts.them || '#FF5E8A'
    this.motion = opts.motion != null ? opts.motion : 20
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.rot = 0
    this.mode = 'idle'
    this.modeT = 0
    this.lastTs = 0
    this.dim = 1
    this.dimTarget = 1
    this.running = false
    this.tilt = 0.58
    this.glows = { you: makeGlow(this.you, 48), them: makeGlow(this.them, 48), warm: makeGlow('#FFE0C2', 48) }
    // Fewer points on small screens keeps the canvas smooth on phones.
    const count = opts.count || (window.innerWidth < 540 ? 1100 : 1500)
    this._gen(count)
    this.trail = []
    this.heroTarget = { r: 0.46, ang: 0 }
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
    this.resize()
  }
  _gen(n) {
    const arms = 2,
      spiral = 2.6
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    this.arm = []
    for (let i = 0; i < n; i++) {
      const t = Math.pow(rnd(), 0.7)
      const arm = Math.floor(rnd() * arms)
      const spread = (1 - t) * 0.42 + 0.05
      const ang = arm * ((Math.PI * 2) / arms) + t * spiral + (rnd() - 0.5) * spread * Math.PI
      const cr = rnd()
      const hue = cr < 0.8 ? COL.cream : cr < 0.91 ? COL.warm : COL.cool
      const glow = rnd() < 0.05
      this.arm.push({
        r: t,
        ang,
        rad: glow ? 1.1 + rnd() * 1.3 : 0.45 + rnd() * 0.95,
        base: (0.3 + rnd() * 0.5) * (1 - t * 0.28),
        hue,
        glow,
        tw: rnd() * 6.28,
        tws: glow ? 0.5 + rnd() : 0.15 + rnd() * 0.5,
      })
    }
    this.dust = []
    const dn = Math.floor(n * 0.5)
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        fx: rnd(),
        fy: rnd(),
        rad: 0.4 + rnd() * 0.7,
        base: 0.1 + rnd() * 0.28,
        tw: rnd() * 6.28,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.w = rect.width || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || 402
    this.h = rect.height || 700
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.maxR = Math.min(this.w, this.h) * 0.72
    this.cx = this.w / 2
    this.cy = this.h * 0.46
  }
  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    if (changed) this.modeT = 0
    if (mode === 'idle') this.dimTarget = data.dim != null ? data.dim : 1
    if (mode === 'sendoff') {
      this.dimTarget = 0.6
      if (changed) {
        this.heroTarget = { r: 0.44, ang: -0.6 }
        this.trail = []
      }
    }
    if (mode === 'resting') this.dimTarget = 0.16
    if (mode === 'match') this.dimTarget = 0.14
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
  }
  setMotion(m) {
    this.motion = m
  }
  setPalette(you, them) {
    this.you = you
    this.them = them
    this.glows.you = makeGlow(you, 48)
    this.glows.them = makeGlow(them, 48)
  }
  _pos(r, ang) {
    const rr = r * this.maxR,
      a = ang + this.rot
    return [this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr * this.tilt]
  }
  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.modeT += dt
    this.rot += dt * (this.motion / 100) * 0.12
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2.2)
    this._draw(dt)
    requestAnimationFrame(this._tick.bind(this))
  }
  _draw(dt) {
    const ctx = this.ctx,
      d = this.dim
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#070510'
    ctx.fillRect(0, 0, this.w, this.h)

    ctx.globalCompositeOperation = 'lighter'
    const coreR = this.maxR * 0.46
    const cg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, coreR)
    cg.addColorStop(0, `rgba(255,206,168,${0.13 * d})`)
    cg.addColorStop(0.45, `rgba(214,150,120,${0.05 * d})`)
    cg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = cg
    ctx.fillRect(0, 0, this.w, this.h)

    ctx.globalCompositeOperation = 'source-over'
    const dustRot = this.rot * 0.1
    for (const p of this.dust) {
      const px = (p.fx - 0.5) * this.w,
        py = (p.fy - 0.5) * this.h
      const x = this.cx + (px * Math.cos(dustRot) - py * Math.sin(dustRot))
      const y = this.cy + (px * Math.sin(dustRot) + py * Math.cos(dustRot))
      p.tw += dt * p.tws
      const a = p.base * (0.75 + 0.25 * Math.sin(p.tw)) * d
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.55, a)
      ctx.fillStyle = p.warm ? COL.warm : COL.cream
      ctx.fillRect(x - p.rad, y - p.rad, p.rad * 2, p.rad * 2)
    }

    const glowQ = []
    for (const st of this.arm) {
      const [x, y] = this._pos(st.r, st.ang)
      if (x < -20 || x > this.w + 20 || y < -20 || y > this.h + 20) continue
      st.tw += dt * st.tws
      const a = st.base * (0.72 + 0.28 * Math.sin(st.tw)) * d
      if (st.glow) glowQ.push([x, y, st, a])
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.7, a)
      ctx.fillStyle = st.hue
      ctx.fillRect(x - st.rad, y - st.rad, st.rad * 2, st.rad * 2)
    }

    ctx.globalCompositeOperation = 'lighter'
    for (const [x, y, st, a] of glowQ) {
      const g = st.hue === COL.cool ? this.glows.them : st.hue === COL.warm ? this.glows.you : this.glows.warm
      const sz = st.rad * 6
      ctx.globalAlpha = Math.min(0.5, a * 0.7)
      ctx.drawImage(g, x - sz / 2, y - sz / 2, sz, sz)
    }

    this._drawHero(dt)
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
  _drawHero(dt) {
    if (this.mode === 'sendoff') {
      const D = 1.9,
        e = easeOut(Math.min(1, this.modeT / D))
      const [tx, ty] = this._pos(this.heroTarget.r, this.heroTarget.ang)
      const mx = (this.cx + tx) / 2 + (ty - this.cy) * 0.3
      const my = (this.cy + ty) / 2 - (tx - this.cx) * 0.3
      const x = (1 - e) * (1 - e) * this.cx + 2 * (1 - e) * e * mx + e * e * tx
      const y = (1 - e) * (1 - e) * this.cy + 2 * (1 - e) * e * my + e * e * ty
      const ctx = this.ctx
      this.trail.push([x, y])
      if (this.trail.length > 22) this.trail.shift()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < this.trail.length; i++) {
        const tp = this.trail[i],
          f = i / this.trail.length,
          ta = f * 0.3 * (1 - e * 0.5)
        const sz = 3 + f * 7
        ctx.globalAlpha = ta
        ctx.drawImage(this.glows.you, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
      }
      this._star(x, y, 'you', 2.2 - e * 0.7, 13 - e * 5, 0.6)
    } else if (this.mode === 'resting') {
      const t = this.modeT
      const x = this.cx + Math.cos(t * 0.32) * this.w * 0.045
      const y = this.h * 0.3 + Math.sin(t * 0.27) * this.h * 0.03
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.4)
      this._star(x, y, 'you', 1.9, 12 * pulse, 0.42 * pulse)
    } else if (this.mode === 'match') {
      const t = this.modeT,
        e = easeOut(Math.min(1, t / 1.6))
      const gap = this.w * 0.16 * (1 - e * 0.4),
        cx = this.cx,
        cy = this.h * 0.3
      const x1 = cx - gap,
        x2 = cx + gap
      const y1 = cy + Math.sin(t * 0.7) * 4,
        y2 = cy - Math.sin(t * 0.7) * 4
      const ctx = this.ctx
      ctx.globalCompositeOperation = 'lighter'
      const lg = ctx.createLinearGradient(x1, y1, x2, y2)
      lg.addColorStop(0, 'rgba(255,150,110,0)')
      lg.addColorStop(0.5, `rgba(255,200,180,${(0.32 + 0.22 * Math.sin(t * 2.4)) * e})`)
      lg.addColorStop(1, 'rgba(255,120,150,0)')
      ctx.strokeStyle = lg
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      this._star(x1, y1, 'you', 2.1, 14, 0.5)
      this._star(x2, y2, 'them', 2.1, 14, 0.5)
    }
  }
}
