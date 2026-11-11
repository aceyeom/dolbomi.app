import { useEffect, useMemo, useRef, useState } from 'react'

// NuvoVet's own laptop: a render made for its landing page
// (nuvovet_systems frontend/public/render/laptop), twenty-four frames of a
// lid opening and one still of it open, with the place of the glass in the
// picture written down beside them. The lid opens once, when the laptop is
// in the window; then the screen is laid into the glass by the homography
// those corners give, so what is on it is real markup at the picture's own
// perspective, and the glass's reflection is laid over that.

const FRAMES = 24
const DURATION = 1200
const SCREEN = { w: 1200, h: 750, tl: [0.305692, 0.039292], tr: [0.936179, 0.08283], br: [0.907912, 0.599746], bl: [0.279259, 0.533539] }
const frameUrl = (n) => `/media/laptop/frame-${String(n).padStart(2, '0')}.webp`

// ── a rectangle onto four points ──
const adj = (m) => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
]
const mulM = (a, b) => {
  const c = Array(9)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]
  return c
}
const mulV = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]
const basis = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = mulV(adj(m), [x4, y4, 1])
  return mulM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}
function onto(w, h, tl, tr, bl, br) {
  const s = basis(0, 0, w, 0, 0, h, w, h)
  const d = basis(tl[0], tl[1], tr[0], tr[1], bl[0], bl[1], br[0], br[1])
  const t = mulM(d, adj(s)).map((v, _, a) => v / a[8])
  return `matrix3d(${t[0]}, ${t[3]}, 0, ${t[6]}, ${t[1]}, ${t[4]}, 0, ${t[7]}, 0, 0, 1, 0, ${t[2]}, ${t[5]}, 0, ${t[8]})`
}

/**
 * @param {{ label: string, lit?: boolean, onOpen?: () => void, children: any }} props
 * `children` is drawn at 1200 by 750 and laid into the glass.
 */
export function Laptop({ label, onOpen, children }) {
  const box = useRef(null)
  const img = useRef(null)
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(0)

  // the lid: once, when most of the laptop is in the window
  useEffect(() => {
    const el = box.current
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setOpen(true)
      if (onOpen) onOpen()
    }
    if (still || typeof IntersectionObserver !== 'function') { finish(); return undefined }
    const frames = Array.from({ length: FRAMES }, (_, i) => { const im = new Image(); im.src = frameUrl(i); return im })
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return
      io.disconnect()
      const t0 = performance.now() + 200
      const step = (now) => {
        const t = Math.max(0, now - t0) / DURATION
        const n = Math.min(FRAMES - 1, Math.floor(t * FRAMES))
        // a frame that has not arrived yet holds the one before it
        if (img.current && frames[n].complete) img.current.src = frames[n].src
        if (t < 1) raf = requestAnimationFrame(step)
        else finish()
      }
      raf = requestAnimationFrame(step)
    }, { threshold: 0.55 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = box.current
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const transform = useMemo(() => {
    if (!width) return 'none'
    const h = width / 1.25
    const p = (q) => [q[0] * width, q[1] * h]
    return onto(SCREEN.w, SCREEN.h, p(SCREEN.tl), p(SCREEN.tr), p(SCREEN.bl), p(SCREEN.br))
  }, [width])

  return (
    <div ref={box} className={`lap${open ? ' is-open' : ''}`}>
      <img ref={img} className="lap-lid" src={frameUrl(0)} alt="" width="1000" height="800" decoding="async" />
      <img className="lap-open" src={width > 700 ? '/media/laptop/open.webp' : '/media/laptop/open-small.webp'} alt="" width="1000" height="800" loading="lazy" decoding="async" />
      <div className="lap-glow" aria-hidden="true" style={{ transform }} />
      <div className="lap-screen" role="group" aria-label={label} style={{ transform }}>
        {children}
      </div>
      <img className="lap-glare" src="/media/laptop/glare.webp" alt="" width="1000" height="800" loading="lazy" decoding="async" />
    </div>
  )
}
