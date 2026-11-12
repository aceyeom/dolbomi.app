import { useEffect, useState } from 'react'
import { Room } from './lamp/Lit.jsx'
import { Hero } from './hero/Hero.jsx'
import { Celestual } from './plates/celestual/Celestual.jsx'
import { Nuvovet } from './plates/nuvovet/Nuvovet.jsx'
import { Index } from './index/Index.jsx'
import { Note } from './contact/Note.jsx'
import { site } from './data/site.js'
import { smooth } from './lib/smooth.js'

const KEY = 'room.lights'

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

  useEffect(() => smooth(), [])

  useEffect(() => {
    document.documentElement.dataset.lights = lights
    try { localStorage.setItem(KEY, lights) } catch { /* as above */ }
  }, [lights])

  return (
    <>
      <a className="skip" href="#celestual">Skip to the work</a>
      <header className="top label">
        <a className="top-name" href="#top">{site.name}</a>
        <nav className="top-nav" aria-label="Sections">
          <a href="#celestual" className="is-wide">Celestual</a>
          <a href="#nuvovet" className="is-wide">NuvoVet</a>
          <a href="#index">Index</a>
          <a href="#note">Note</a>
          <button type="button" className="lights" aria-pressed={lights === 'up'} onClick={() => setLights((v) => (v === 'up' ? 'lamp' : 'up'))}>
            Lights
          </button>
        </nav>
      </header>

      <main>
        <Hero />
        <Celestual />
        <Nuvovet />
        <Index />
        <Note />
      </main>

      <footer className="foot label">
        <span>{site.name} {site.year}</span>
        <span>Roboto Flex, Doto. Jersey 10 on Celestual’s screens, Pretendard on NuvoVet’s.</span>
      </footer>

      <Room />
    </>
  )
}
