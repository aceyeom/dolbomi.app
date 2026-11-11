import { Lit } from '../lamp/Lit.jsx'
import '../styles/plate.css'

/**
 * One work, hung. Every plate is the same sentence: its number and name,
 * one line that says what it is, the thing itself on the right to be
 * handled, then what there is to know about it. The grammar is fixed so
 * that two very different works read as one hand's, and only the object
 * differs.
 *
 *   numeral   'I', 'II': the plate's place in the room
 *   title     the work's name
 *   lede      one line
 *   facts     [[term, definition], ...]
 *   link      { href, label }
 *   children  the paragraphs
 *   stage     the object (a <Stage>)
 */
export function Plate({ id, numeral, title, lede, facts = [], link, stage, children }) {
  return (
    <section className="plate" id={id} aria-labelledby={`${id}-title`}>
      <div className="wrap plate-grid">
        <Lit as="header" className="plate-head" depth="text">
          <p className="plate-no caption">Plate {numeral}</p>
          <h2 className="plate-title" id={`${id}-title`}>{title}</h2>
          <p className="plate-lede">{lede}</p>
        </Lit>

        <div className="plate-stage">{stage}</div>

        <Lit className="plate-body" depth="text">
          <div className="plate-prose">{children}</div>
          <dl className="plate-facts">
            {facts.map(([term, def]) => (
              <div key={term} className="plate-fact">
                <dt>{term}</dt>
                <dd>{def}</dd>
              </div>
            ))}
          </dl>
          {link ? (
            <p className="plate-out">
              <a className="link" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
            </p>
          ) : null}
        </Lit>
      </div>
    </section>
  )
}

/**
 * Where a plate's object stands, and the two things under every one: a line
 * that says what is happening, and the keys that make it happen. The keys
 * are a phone's soft keys, one at each end of a hairline, on both plates.
 *
 *   rest      where on the stage the lamp rests when nobody is holding it ("x y" as fractions);
 *             null when the object marks its own place with `data-lamp-rest`
 *   caption   the line, announced politely when it changes
 *   keys      [{ label, onPress, disabled }] : the first at the left end, the second at the right
 */
export function Stage({ rest = '0.5 0.42', caption, keys = [], label, children }) {
  return (
    <figure className="stage" aria-label={label}>
      <div className="stage-object" data-lamp-rest={rest || undefined}>{children}</div>
      <figcaption className="stage-foot">
        <p className="stage-caption caption" role="status" aria-live="polite">{caption}</p>
        <div className="stage-keys">
          {keys.map((k) => (
            <button key={k.label} type="button" className="key" onClick={k.onPress} disabled={k.disabled}>
              {k.label}
            </button>
          ))}
        </div>
      </figcaption>
    </figure>
  )
}
