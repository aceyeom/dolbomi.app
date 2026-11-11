import { useEffect, useRef, useState } from 'react'
import { lamp } from '../lamp/lamp.js'
import { createRelief } from './relief.js'
import { site } from '../data/site.js'
import '../styles/hero.css'

/**
 * The first wall. The name stands off it in relief and the lamp is held to
 * it (relief.js). The heading is real text underneath: it is what a screen
 * reader and a search engine get, and what is shown as plain type where
 * there is no WebGL to light it.
 */
export function Hero({ lights }) {
  const canvas = useRef(null)
  const relief = useRef(null)
  const [drawn, setDrawn] = useState(false)
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    let alive = true
    let off = null
    let ro = null
    let timer = 0
    const start = () => {
      if (!alive || !canvas.current) return
      const r = createRelief(canvas.current, { words: site.words, family: 'Newsreader', weight: 440 })
      if (!r) return
      relief.current = r
      r.resize()
      r.flat(document.documentElement.dataset.lights === 'up')
      setDrawn(true)
      off = lamp.subscribe((f) => r.set(f))
      // a window being dragged is redrawn at its old size and struck again once it is still
      ro = new ResizeObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(() => r.resize(), 140)
      })
      ro.observe(canvas.current)
    }
    // the name is set in the page's own face, so it waits for it
    const face = document.fonts?.load ? document.fonts.load('440 120px Newsreader', site.name) : Promise.resolve()
    Promise.race([face, new Promise((res) => setTimeout(res, 2500))]).then(start, start)
    return () => {
      alive = false
      clearTimeout(timer)
      if (off) off()
      if (ro) ro.disconnect()
      if (relief.current) relief.current.destroy()
      relief.current = null
    }
  }, [])

  useEffect(() => {
    if (relief.current) relief.current.flat(lights === 'up')
  }, [lights])

  // the hint is an instruction, and it goes out once it has been followed
  useEffect(() => {
    if (moved) return undefined
    let travelled = 0
    let last = null
    const on = (x, y) => {
      if (last) travelled += Math.hypot(x - last[0], y - last[1])
      last = [x, y]
      if (travelled > 420) setMoved(true)
    }
    const mouse = (e) => { if (e.pointerType !== 'touch') on(e.clientX, e.clientY) }
    const finger = (e) => { const t = e.touches[0]; if (t) on(t.clientX, t.clientY) }
    window.addEventListener('pointermove', mouse, { passive: true })
    window.addEventListener('touchmove', finger, { passive: true })
    return () => {
      window.removeEventListener('pointermove', mouse)
      window.removeEventListener('touchmove', finger)
    }
  }, [moved])

  return (
    <section className={`hero${drawn ? ' is-drawn' : ''}`} id="top" aria-labelledby="hero-name" data-lamp-rest="0.3 0.4">
      <canvas ref={canvas} className="hero-relief" aria-hidden="true" />
      <h1 id="hero-name" className="hero-name">
        {site.words.map((w) => <span key={w}>{w} </span>)}
      </h1>
      <div className="hero-foot">
        <p className="hero-line">
          Founder of <a href="#celestual">Celestual</a> and <a href="#nuvovet">NuvoVet</a>.
        </p>
        <p className={`hero-hint${moved ? ' is-out' : ''}`} aria-hidden={moved || undefined}>
          <span className="for-mouse">Move the lamp.</span>
          <span className="for-touch">Drag the lamp.</span>
        </p>
      </div>
    </section>
  )
}
