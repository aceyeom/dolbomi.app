import { useEffect, useRef, useState } from 'react'
import { lamp } from '../lamp/lamp.js'
import './wall.css'

/**
 * The wall of letters, pinned while the scroll pulls the camera back from
 * the first one (wall.js). three.js and the sheet of letters are fetched
 * only as the wall comes near, so nobody pays for them at the door.
 */
export function Wall() {
  const pin = useRef(null)
  const canvas = useRef(null)
  const [beat, setBeat] = useState(0) // 0 the one letter, 1 pulling back, 2 the whole wall

  useEffect(() => {
    let wall = null
    let off = null
    let ro = null
    let alive = true
    let raf = 0

    const read = () => {
      raf = 0
      const el = pin.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      if (wall) wall.progress(p)
      setBeat(p < 0.1 ? 0 : p < 0.72 ? 1 : 2)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read) }

    const start = () => import('./wall.js').then(({ createWall }) => {
      if (!alive || !canvas.current) return
      wall = createWall(canvas.current, { sheet: '/media/wall.webp' })
      if (!wall) return
      wall.resize()
      off = lamp.subscribe((f) => wall.lamp(f))
      ro = new ResizeObserver(() => wall.resize())
      ro.observe(canvas.current)
      read()
    })
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { io.disconnect(); start() }
    }, { rootMargin: '120% 0px' })
    io.observe(pin.current)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      alive = false
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (off) off()
      if (ro) ro.disconnect()
      if (wall) wall.destroy()
    }
  }, [])

  return (
    <div ref={pin} className="wall" data-beat={beat}>
      <div className="wall-stick" data-lamp-rest="0.5 0.46">
        <canvas ref={canvas} className="wall-canvas" role="img" aria-label="A wall of Celestual’s anonymous letters, each one a lit phone screen" />
        <p className="wall-words is-first" aria-hidden={beat !== 0}>one letter.</p>
        <p className="wall-words is-last" aria-hidden={beat !== 2}>a wall of the ones<br />you never told.</p>
      </div>
    </div>
  )
}
