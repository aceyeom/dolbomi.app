import { useMemo } from 'react'
import { glyph, skin, HUES } from './pix.js'

function Pix({ name, h }) {
  const g = useMemo(() => glyph(name), [name])
  return (
    <svg
      className="cs-px" viewBox={`0 0 ${g.w} ${g.h}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false"
      style={{ height: `${h}cqw`, width: `${((h * g.w) / g.h).toFixed(2)}cqw` }}
    >
      <path d={g.d} />
    </svg>
  )
}

/**
 * One of Celestual's letters: a phone screen left on in a dark room. The
 * status across the top, the words, the soft keys at the foot, in the
 * product's one face on the product's grid.
 *
 *   power   'off'      dark glass, nothing on it
 *           'on'       lit
 *           'standby'  lit low: something is being kept
 *   face    'note'     a note being written or read: `dear`, `words`, `typed`
 *           'sealed'   the envelope, and the line under it
 *           'clock'    the night it is all told
 *   colour  'ice' | 'amber'
 */
export function Screen({ power = 'off', face = 'note', colour = 'ice', stamp, dear, words = '', typed = words.length, writing = false, line, label }) {
  const vars = useMemo(() => skin(HUES[colour]), [colour])
  const shown = words.slice(0, typed)
  const rest = words.slice(typed)
  return (
    <div className={`cs-scene is-${power}`} style={vars} role="img" aria-label={label}>
      <div className="cs-halo" aria-hidden="true" />
      <div className={`cs-scr is-${face}`} aria-hidden="true">
        <div className="cs-bg" />
        <div className="cs-top">
          <div className="cs-row">
            <Pix name="ant" h={9.4} />
            <span className="cs-stamp">{stamp}</span>
            <Pix name="bat" h={7.4} />
          </div>
          <div className="cs-row">
            <Pix name="pen" h={9.4} />
            <span className="cs-dear">{dear ? `dear ${dear}` : ''}</span>
          </div>
        </div>

        <div className="cs-body">
          {face === 'note' ? (
            <p className="cs-words">
              {shown}
              <span className={`cs-caret${writing ? ' is-writing' : ''}`} />
              <span className="cs-unsaid">{rest}</span>
            </p>
          ) : null}
          {face === 'sealed' ? (
            <div className="cs-center">
              <Pix name="env" h={15} />
              <p className="cs-line">{line}</p>
            </div>
          ) : null}
          {face === 'clock' ? (
            <div className="cs-center">
              <p className="cs-clock">sat<br />9:00 pm</p>
            </div>
          ) : null}
        </div>

        <div className="cs-keys">
          <span>options</span>
          <span className="cs-heart"><Pix name="heartO" h={7.4} />0</span>
        </div>
        <div className="cs-grid" />
        <div className="cs-glare" />
      </div>
    </div>
  )
}
