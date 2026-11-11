import { useEffect, useRef, useState } from 'react'
import { Plate, Stage } from '../Plate.jsx'
import { Lit } from '../../lamp/Lit.jsx'
import { useSequence } from '../../lib/sequence.js'
import { CLAIM, LINES, won, plain } from './claim.js'
import '../../styles/nuvovet.css'

const COUNT = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']

/** What the engine made of one line: the receipt's words on the left of a rule, the reading on the right. */
function Reading({ line }) {
  if (!line) {
    return (
      <div className="nv-reading is-empty">
        <p className="caption">
          <span className="for-mouse">Hold a line of the receipt to the lamp.</span>
          <span className="for-touch">Touch a line of the receipt.</span>
        </p>
      </div>
    )
  }
  const rows = line.kind === 'fee'
    ? [
        ['As typed', <span className="nv-ko">{line.raw}</span>],
        ['Read as', <><span className="nv-code">{line.code}</span><span className="nv-gloss">{line.en}</span><span className="nv-ko nv-sub">{line.name}</span></>],
        ['Charged', <span className="nv-n">{won(line.unit)}{line.qty > 1 ? ` × ${line.qty}` : ''}</span>],
        ['In Seoul', <span className="nv-n">{won(line.median)} at the median, {won(line.p90)} at the 90th percentile</span>],
        ['Finding', <><span className="nv-flag">Regional price outlier, P{line.pct}</span><span className="nv-n nv-sub">{won(line.risk)} above the 90th percentile</span></>],
        ['Evidence', 'Fee benchmark, a seed estimate'],
      ]
    : [
        ['As typed', <span className="nv-ko">{line.raw}</span>],
        ['Read as', <><span className="nv-code">{line.code}</span><span className="nv-gloss">{line.en}</span><span className="nv-ko nv-sub">{line.name}</span></>],
        ['Charged', <span className="nv-n">{won(line.unit)}{line.qty > 1 ? ` × ${line.qty}` : ''}</span>],
        line.dose ? ['Dose', <span className="nv-n">{line.dose}</span>] : null,
        ['Finding', line.note || 'None'],
        ['Matched by', line.by],
      ].filter(Boolean)
  return (
    <dl className="nv-reading" key={line.raw}>
      {rows.map(([term, def]) => (
        <div key={term} className="nv-row">
          <dt>{term}</dt>
          <dd>{def}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Nuvovet() {
  const [read, setRead] = useState(() => new Set())
  const [at, setAt] = useState(-1)
  const [busy, setBusy] = useState(false)
  const run = useSequence()
  const desk = useRef(null)
  const touched = useRef(false)

  const look = (i) => {
    touched.current = true
    setAt(i)
    setRead((s) => (s.has(i) ? s : new Set(s).add(i)))
  }

  // The first time the receipt comes into view it reads its dearest line by
  // itself, once, so the plate explains itself to somebody who only scrolls.
  useEffect(() => {
    const el = desk.current
    if (!el || typeof IntersectionObserver !== 'function') return undefined
    let timer = 0
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return
      io.disconnect()
      timer = setTimeout(() => {
        if (touched.current) return
        setAt(5)
        setRead((s) => new Set(s).add(5))
      }, 900)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [])

  const done = read.size === LINES.length

  const next = () => {
    const i = LINES.findIndex((_, k) => !read.has(k))
    if (i >= 0) look(i)
  }
  const all = () => run(async ({ wait }) => {
    touched.current = true
    setBusy(true)
    for (let i = 0; i < LINES.length; i++) {
      setAt(i)
      setRead((s) => (s.has(i) ? s : new Set(s).add(i)))
      await wait(150)
    }
    setBusy(false)
  })
  const again = () => run(async () => {
    setRead(new Set())
    setAt(-1)
    setBusy(false)
  })

  const caption = done
    ? `The decision is review, with ${COUNT[CLAIM.findings]} findings attached. Of ${won(CLAIM.billed)} billed, ${won(CLAIM.payable)} is payable, capped by the policy’s annual limit. An adjuster confirms it.`
    : read.size === 0
      ? `A receipt for ${CLAIM.diagnosisEn.toLowerCase()} surgery on a toy poodle, as the clinic typed it. Eleven lines.`
      : `${COUNT[read.size][0].toUpperCase()}${COUNT[read.size].slice(1)} of eleven lines read.`

  const keys = done
    ? [{ label: 'Start again', onPress: again }]
    : [
        { label: 'Read the next line', onPress: next, disabled: busy },
        { label: 'Read all eleven', onPress: all, disabled: busy },
      ]

  return (
    <Plate
      id="nuvovet" numeral="II" title="NuvoVet"
      lede="A vet’s receipt, read into a decision with its evidence."
      facts={[
        ['Role', 'Founder'],
        ['Since', '2026'],
        ['Made with', 'Python and FastAPI, a deterministic rules engine, React'],
        ['Standing', 'Live at nuvovet.com, on synthetic claims'],
      ]}
      link={{ href: 'https://www.nuvovet.com', label: 'nuvovet.com' }}
      stage={(
        <Stage rest={null} caption={caption} keys={keys} label="NuvoVet, shown on one receipt">
          <div className="nv-desk" ref={desk}>
            <Lit className="nv-paper-lit" depth="object" data-lamp-rest="0.5 0.36">
              <div className={`nv-paper${done ? ' is-decided' : ''}`}>
                <div className="nv-head">
                  <p className="nv-clinic">{CLAIM.clinic}</p>
                  <p>{CLAIM.region} {CLAIM.date}</p>
                  <p>{CLAIM.patient}</p>
                  <p>{CLAIM.diagnosis}</p>
                </div>
                <ol className="nv-lines">
                  {LINES.map((l, i) => (
                    <li key={l.raw}>
                      <button
                        type="button"
                        className={`nv-line${at === i ? ' is-at' : ''}${read.has(i) ? ' is-read' : ''}`}
                        aria-pressed={at === i}
                        onClick={() => look(i)}
                        onFocus={() => look(i)}
                        onPointerEnter={(e) => { if (e.pointerType === 'mouse') look(i) }}
                      >
                        <span className="nv-desc">
                          {l.raw}
                          {l.qty > 1 ? <span className="nv-qty"> {plain(l.unit)} × {l.qty}</span> : null}
                        </span>
                        <span className="nv-amt">{plain(l.unit * l.qty)}</span>
                        <span className="nv-mark" aria-hidden="true">
                          {l.kind === 'fee' ? `${l.code}  P${l.pct}` : l.code}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="nv-total"><span>합계</span><span>{plain(CLAIM.billed)}</span></p>
                <p className="nv-stamp" aria-hidden="true">
                  <span>{CLAIM.decisionKo}</span>
                  <span>review</span>
                </p>
              </div>
            </Lit>

            <Lit className="nv-reading-lit" depth="text">
              <Reading line={at >= 0 ? LINES[at] : null} />
            </Lit>
          </div>
        </Stage>
      )}
    >
      <p>
        In Korea a pet insurance claim arrives as a photograph of a receipt, and every clinic types its receipts
        its own way. NuvoVet reads each line to a standard code, holds the claim against coverage, clinical,
        pricing and integrity rules, and hands an adjuster a decision with the evidence for it. It never denies
        a claim on its own.
      </p>
      <p>
        Two products run on the one engine: nuvovet Claims, for insurers, and nuvovet DUR, which reviews a
        prescription inside the clinic’s own records system as it is written.
      </p>
    </Plate>
  )
}
