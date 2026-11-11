import { useEffect, useRef, useState } from 'react'
import { ImageDithering } from '@paper-design/shaders-react'
import { lamp } from '../lamp/lamp.js'
import { Lit } from '../lamp/Lit.jsx'
import { LightType } from '../type/LightType.jsx'
import { works as bundled, roman } from '../data/works.js'
import { fetchWorks } from '../api/db.js'
import './index.css'

// The dither is a shader. Where there is no WebGL to run it, the picture in
// the dark is the picture itself, greyed and turned down.
const canDither = (() => {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
})()

/**
 * One work in the index. In the dark its picture is only its dither: two
 * tones, the way a cheap screen would draw it. Under the lamp the picture
 * itself comes through, in a pool the size of the lamp, so a visitor
 * develops each one by holding the light to it.
 */
function Card({ work, n }) {
  const glass = useRef(null)
  const truth = useRef(null)
  useEffect(() => lamp.addShade(glass.current, truth.current), [])
  const inner = (
    <>
      <div ref={glass} className="card-glass">
        {work.plate ? (
          <>
            {canDither ? (
              <ImageDithering
                className="card-dither" image={work.plate} fit="cover" speed={0}
                colorBack="#050505" colorFront="#f3eee5" colorHighlight="#ff3d1f"
                type="4x4" size={3} colorSteps={2} originalColors={false}
              />
            ) : <img className="card-dither is-plain" src={work.plate} alt="" loading="lazy" decoding="async" />}
            <div ref={truth} className="card-true"><img src={work.plate} alt="" loading="lazy" decoding="async" width="800" height="1000" /></div>
          </>
        ) : <div ref={truth} className="card-true" />}
      </div>
      <p className="label card-meta"><b>{roman(n)}</b><span>{work.kind}</span><span>{work.year}</span></p>
      <p className="card-name">{work.title}</p>
    </>
  )
  const outside = work.href && /^https?:/.test(work.href)
  return (
    <li className="card">
      {work.href
        ? <a className="card-link" href={work.href} {...(outside ? { target: '_blank', rel: 'noreferrer' } : {})}>{inner}</a>
        : <div className="card-link">{inner}</div>}
    </li>
  )
}

/** Everything in the room, as pictures. Drawn at once from the bundled list, then from the database. */
export function Index() {
  const [rows, setRows] = useState(bundled)
  useEffect(() => {
    let live = true
    fetchWorks().then((fresh) => { if (live && fresh) setRows(fresh) })
    return () => { live = false }
  }, [])

  return (
    <section className="work index" id="index" aria-labelledby="index-title" data-lamp-colour="255,61,31,0.5">
      <header className="work-head">
        <Lit className="work-meta label" depth="text"><span><b>III</b></span><span>Everything</span><span>{rows.length} works</span></Lit>
        <div data-lamp-rest="0.12 0.5">
          <LightType as="h2" className="work-title" id="index-title" text="Index" reach={0.6} />
        </div>
      </header>
      <ol className="cards" data-lamp-rest="0.3 0.4">
        {rows.map((w, i) => <Card key={w.slug} work={w} n={i + 1} />)}
      </ol>
    </section>
  )
}
