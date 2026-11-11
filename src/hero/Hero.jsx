import { useEffect, useRef } from 'react'
import { lamp } from '../lamp/lamp.js'
import { LightType } from '../type/LightType.jsx'
import { site } from '../data/site.js'
import './hero.css'

/**
 * The first wall. The name, hairline thin in the dark, and the lamp: on
 * arrival it makes one pass across the name by itself, so the first thing a
 * visitor sees is what the light does to a letter, and then it is theirs.
 */
export function Hero() {
  const name = useRef(null)

  useEffect(() => {
    let live = true
    const go = () => {
      if (!live || !name.current) return
      const r = name.current.getBoundingClientRect()
      const y = r.top + r.height * 0.5
      lamp.pass([r.left - r.width * 0.2, y], [r.left + r.width * 0.3, y], 1700)
    }
    const ready = document.fonts?.ready || Promise.resolve()
    Promise.race([ready, new Promise((res) => setTimeout(res, 1800))]).then(() => setTimeout(go, 250))
    return () => { live = false }
  }, [])

  return (
    <section className="hero" id="top" aria-label={site.name} data-lamp-colour="255,61,31,1">
      <p className="hero-over label"><b>Portfolio</b><span>{site.year}</span></p>
      <div ref={name} className="hero-name-box" data-lamp-rest="0.3 0.5">
        <LightType as="h1" className="hero-name is-stack" text={site.name} reach={0.62} />
      </div>
      <div className="hero-under">
        <p className="line">Founder of <a href="#celestual">Celestual</a> and <a href="#nuvovet">NuvoVet</a>.</p>
        <p className="label hero-hint"><span className="for-mouse">Move the light</span><span className="for-touch">Drag the light</span></p>
      </div>
    </section>
  )
}
