import { createElement, useEffect, useMemo, useRef } from 'react'
import { lamp } from '../lamp/lamp.js'
import './lighttype.css'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIGHT IS WEIGHT                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// The room's headline type has no weight of its own. In the dark a letter is
// a hairline, narrow and barely there. Where the lamp falls it swells: wider,
// heavier, and bone white, until right under the lamp it is as black a
// letter as the face can cut. Tenebrism, set in type: the dark thins, the
// light fattens.
//
// The face is Roboto Flex, whose weight runs 100 to 1000 and whose width
// runs 25 to 151, so one letter can be both. Each letter is its own span;
// every frame the lamp moves, each reads how far it is from the lamp and is
// given its two axes and its brightness. All the boxes are read first and
// all the styles written after, so a frame lays the line out once.
//
//   text     the words (kept whole in aria-label; the letters are decoration)
//   thin     [weight, width] in the dark
//   fat      [weight, width] under the lamp
//   reach    how much of the lamp's reach a letter answers to (1 = all of it)
//   dark     how bright a letter is in the dark, 0 to 1

const mix = (a, b, t) => a + (b - a) * t

export function LightType({ as = 'h2', text, className = '', thin = [130, 46], fat = [1000, 151], reach = 0.7, dark = 0.3, ...rest }) {
  const root = useRef(null)
  const words = useMemo(() => text.split(' '), [text])

  useEffect(() => {
    const el = root.current
    const inner = el.firstElementChild
    const letters = [...el.querySelectorAll('.lt-l')]
    const state = letters.map(() => -1)
    let fit = 1
    let seen = true
    const io = new IntersectionObserver(([en]) => { seen = en.isIntersecting }, { rootMargin: '20% 0px' })
    io.observe(el)

    const off = lamp.subscribe((f) => {
      if (!seen) return
      const up = f.lights === 'up'
      const R = f.radius * reach
      // read
      const ts = letters.map((l) => {
        if (up) return 0.62
        const r = l.getBoundingClientRect()
        const dx = (r.left + r.width / 2 - f.x) / R
        const dy = (r.top + r.height / 2 - f.y) / (R * 1.25)
        const d = Math.sqrt(dx * dx + dy * dy)
        const t = Math.max(0, 1 - d)
        return t * t * (3 - 2 * t) * f.light
      })
      // the line is never wider than its place: a swollen line is drawn a little smaller, whole
      const room = el.clientWidth
      const wants = inner.scrollWidth
      const k = wants > room + 1 ? room / wants : 1
      // write
      if (Math.abs(k - fit) > 0.002) {
        fit = k
        inner.style.transform = k < 1 ? `scale(${k.toFixed(4)})` : ''
      }
      letters.forEach((l, i) => {
        const t = ts[i]
        if (Math.abs(t - state[i]) < 0.004) return
        state[i] = t
        l.style.fontWeight = Math.round(mix(thin[0], fat[0], t))
        l.style.fontStretch = `${mix(thin[1], fat[1], t).toFixed(1)}%`
        // a solid colour, not a see-through one: the dots of the light never show through a letter
        const k = mix(dark, 1, Math.min(1, t * 1.7))
        l.style.color = `rgb(${Math.round(243 * k)}, ${Math.round(238 * k)}, ${Math.round(229 * k)})`
      })
    })
    return () => { off(); io.disconnect() }
  }, [text, thin, fat, reach, dark])

  return createElement(
    as,
    { ref: root, className: `lt ${className}`, 'aria-label': text, ...rest },
    <span className="lt-in" aria-hidden="true">
      {words.map((w, wi) => (
        <span key={wi} className="lt-w">
          {[...w].map((ch, i) => <span key={i} className="lt-l">{ch}</span>)}
        </span>
      ))}
    </span>,
  )
}
