import { Lit } from '../lamp/Lit.jsx'
import { LightType } from '../type/LightType.jsx'
import './work.css'

/**
 * The head of a work: its number, what it is, where it lives, its name in
 * the room's headline type, and one line. Nothing else is said about a work
 * in words; the rest is the work.
 */
export function WorkHead({ id, numeral, kind, year, title, line, href, site }) {
  return (
    <header className="work-head">
      <Lit className="work-meta label" depth="text">
        <span><b>{numeral}</b></span>
        <span>{kind}</span>
        <span>{year}</span>
        {href ? <a className="work-site" href={href} target="_blank" rel="noreferrer">{site}</a> : null}
      </Lit>
      <div data-lamp-rest="0.2 0.5">
        <LightType as="h2" className="work-title" id={`${id}-title`} text={title} reach={0.6} />
      </div>
      <Lit depth="text"><p className="line work-line">{line}</p></Lit>
    </header>
  )
}

/** Under an object: one short line that says what is happening, and the keys that make it happen. */
export function Keys({ caption, keys = [] }) {
  return (
    <div className="keys">
      <p className="keys-caption" role="status" aria-live="polite">{caption}</p>
      <div className="keys-row">
        {keys.map((k) => (
          <button key={k.label} type="button" className="key" onClick={k.onPress} disabled={k.disabled}>{k.label}</button>
        ))}
      </div>
    </div>
  )
}
