import { useEffect, useRef } from 'react'
import { lamp } from './lamp.js'
import '../styles/lamp.css'

/**
 * A region the lamp falls on. It is drawn as it looks fully lit, and a shade
 * is laid over it with the lamp's hole in it (lamp.css `.shade`).
 *
 *   depth="text"    words: they dim away from the lamp but can always be read
 *   depth="object"  a thing: it goes almost to the dark, and comes out of it
 *   depth="deep"    a picture: nothing of it until the light is on it
 *
 * `lit` (0 to 1) lifts the shade by hand, for a thing that has its own light
 * on (a screen that is lit, a plate under its picture light).
 */
export function Lit({ as: Tag = 'div', depth = 'text', lit = 0, className = '', children, style, ...rest }) {
  const region = useRef(null)
  const shade = useRef(null)
  useEffect(() => lamp.addShade(region.current, shade.current), [])
  return (
    <Tag ref={region} className={`lit ${className}`} data-depth={depth} style={style} {...rest}>
      {children}
      <span ref={shade} className="shade" aria-hidden="true" style={lit ? { opacity: 1 - lit } : undefined} />
    </Tag>
  )
}

/** The pool the lamp leaves on the wall, and the grain that makes the dark a room. Mounted once. */
export function Room() {
  const haze = useRef(null)
  useEffect(() => {
    lamp.setHaze(haze.current)
    lamp.start()
    let live = true
    const up = () => { if (live) lamp.light() }
    // the lamp waits for the faces, so the first thing it lights is the real page
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]).then(up)
    } else up()
    return () => { live = false }
  }, [])
  return (
    <>
      <div ref={haze} className="haze" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
