import Lenis from 'lenis'

// The page is scrolled on a little inertia (Lenis), so the wall's pull back
// and everything else tied to the scroll moves as one continuous thing and
// not in the steps of a wheel. Not with reduced motion, and not on touch,
// where the finger already is the inertia.
export function smooth() {
  if (typeof window === 'undefined') return () => {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return () => {}
  const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: true })
  let raf = 0
  const tick = (t) => { lenis.raf(t); raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)
  return () => { cancelAnimationFrame(raf); lenis.destroy() }
}
