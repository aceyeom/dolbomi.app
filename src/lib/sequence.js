import { useCallback, useEffect, useRef } from 'react'

const reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }
export const reducedMotion = () => reduce.matches

/**
 * A short scripted run of steps with waits between them, that can be cut
 * off: starting another one, or the component going, ends the one in hand at
 * its next wait. `run(async ({ wait, type }) => { ... })`.
 *
 *   wait(ms)                 a pause; a third as long with reduced motion
 *   type(length, onCount)    count up to `length` at a hand's pace, calling
 *                            onCount(n); all at once with reduced motion
 */
export function useSequence() {
  const token = useRef(0)
  useEffect(() => () => { token.current += 1 }, [])

  return useCallback((script) => {
    const mine = ++token.current
    const live = () => mine === token.current
    const gone = Symbol('cut')
    const wait = (ms) => new Promise((resolve, reject) => {
      setTimeout(() => (live() ? resolve() : reject(gone)), reducedMotion() ? ms / 3 : ms)
    })
    const type = async (length, onCount) => {
      if (reducedMotion()) { onCount(length); return }
      for (let n = 1; n <= length; n++) {
        onCount(n)
        // a hand's pace: quick inside a word, a breath at a full stop
        await wait(n % 9 === 0 ? 70 : 30)
      }
    }
    Promise.resolve(script({ wait, type, live })).catch((e) => { if (e !== gone) throw e })
    return () => { if (live()) token.current += 1 }
  }, [])
}
