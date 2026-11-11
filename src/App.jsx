import { useEffect, useState } from 'react'
import { Room } from './lamp/Lit.jsx'
import { Hero } from './hero/Hero.jsx'
import { Celestual } from './plates/celestual/Celestual.jsx'
import { Nuvovet } from './plates/nuvovet/Nuvovet.jsx'
import { Catalogue } from './catalogue/Catalogue.jsx'
import { About } from './about/About.jsx'
import { site } from './data/site.js'

const KEY = 'room.lights'

// The room is dark unless the visitor has said otherwise, or their system
// asks for more contrast than a lamp gives.
function firstLights() {
  try {
    const kept = localStorage.getItem(KEY)
    if (kept === 'up' || kept === 'lamp') return kept
  } catch { /* a browser that keeps nothing is still a browser */ }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-contrast: more)').matches) return 'up'
  return 'lamp'
}

export function App() {
  const [lights, setLights] = useState(firstLights)
  // past the first wall the head of the page stands on the dark, so words do not run under words
  const [past, setPast] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.lights = lights
    try { localStorage.setItem(KEY, lights) } catch { /* as above */ }
  }, [lights])

  useEffect(() => {
    const hero = document.getElementById('top')
    if (!hero || typeof IntersectionObserver !== 'function') return undefined
    const io = new IntersectionObserver(([en]) => setPast(en.intersectionRatio < 0.3), { threshold: [0.3] })
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <a className="skip" href="#works">Skip to the work</a>
      <header className={`top${past ? ' is-past' : ''}`}>
        <a className="top-name" href="#top">{site.name}</a>
        <nav className="top-nav" aria-label="Sections">
          <a href="#works">Works</a>
          <a href="#index">Index</a>
          <a href="#about" className="is-wide">About</a>
          <button
            type="button" className="lights" aria-pressed={lights === 'up'}
            onClick={() => setLights((v) => (v === 'up' ? 'lamp' : 'up'))}
          >
            House lights
          </button>
        </nav>
      </header>

      <main>
        <Hero lights={lights} />
        <div id="works">
          <Celestual />
          <Nuvovet />
        </div>
        <Catalogue />
        <About />
      </main>

      <footer className="foot wrap">
        <div className="foot-row">
          <p>{site.name}, {site.year}.</p>
          <p>Set in Newsreader. The screens are in Jersey 10 and the receipt in Pretendard, as their own products set them.</p>
        </div>
      </footer>

      <Room />
    </>
  )
}
