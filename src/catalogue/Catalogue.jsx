import { useEffect, useState } from 'react'
import { Lit } from '../lamp/Lit.jsx'
import { works as bundled, roman } from '../data/works.js'
import { fetchWorks } from '../api/db.js'
import '../styles/catalogue.css'

/**
 * Everything in the room, as a list: the two plates above and whatever else
 * has been hung. A row under the hand has its picture lit in the frame
 * beside it. The list is drawn at once from the bundled file and then from
 * the database, so it is never empty and never waits.
 */
export function Catalogue() {
  const [rows, setRows] = useState(bundled)
  const [at, setAt] = useState(0)

  useEffect(() => {
    let live = true
    fetchWorks().then((fresh) => { if (live && fresh) setRows(fresh) })
    return () => { live = false }
  }, [])

  const active = rows[Math.min(at, rows.length - 1)]

  return (
    <section className="catalogue" id="index" aria-labelledby="index-title">
      <div className="wrap catalogue-grid">
        <Lit className="catalogue-list" depth="text">
          <h2 className="catalogue-title" id="index-title">Index</h2>
          <ol className="rows">
            {rows.map((w, i) => {
              const inner = (
                <>
                  <span className="row-no">{roman(i + 1)}</span>
                  <span className="row-title">{w.title}</span>
                  <span className="row-kind">{w.kind}</span>
                  <span className="row-year num">{w.year}</span>
                </>
              )
              const common = {
                className: `row${at === i ? ' is-at' : ''}`,
                onPointerEnter: (e) => { if (e.pointerType === 'mouse') setAt(i) },
                onFocus: () => setAt(i),
              }
              const outside = w.href && /^https?:/.test(w.href)
              return (
                <li key={w.slug}>
                  {w.href ? (
                    <a {...common} href={w.href} {...(outside ? { target: '_blank', rel: 'noreferrer' } : {})}>{inner}</a>
                  ) : (
                    <button type="button" {...common} onClick={() => setAt(i)} aria-pressed={at === i}>{inner}</button>
                  )}
                </li>
              )
            })}
          </ol>
        </Lit>

        <figure className="frame" data-lamp-rest="0.5 0.3">
          <div className="frame-glass">
            {rows.map((w, i) => (w.plate ? (
              <img
                key={w.slug} src={w.plate} alt="" loading="lazy" decoding="async"
                className={at === i ? 'is-at' : ''} width="800" height="1000"
              />
            ) : null))}
          </div>
          <figcaption className="caption" aria-live="polite">{active?.note}</figcaption>
        </figure>
      </div>
    </section>
  )
}
