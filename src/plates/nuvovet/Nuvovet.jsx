import { useEffect, useRef, useState } from 'react'
import { WorkHead, Keys } from '../../chrome/WorkHead.jsx'
import { Lit } from '../../lamp/Lit.jsx'
import { lamp } from '../../lamp/lamp.js'
import { useSequence } from '../../lib/sequence.js'
import { Laptop } from './Laptop.jsx'
import { CLAIM, LINES, won, plain } from './claim.js'
import '../../styles/nuvovet.css'

const COUNT = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']

/**
 * What the engine made of one line, on the laptop: its code, large; its
 * name; and for a fee, where its price stands against the region's, drawn
 * as a rule with the median, the ninetieth percentile and the price on it.
 */
function Reading({ line, index }) {
  if (line.kind === 'fee') {
    const top = line.unit * 1.06
    const at = (v) => `${((v / top) * 100).toFixed(2)}%`
    return (
      <div className="nvs-read" key={line.code}>
        <p className="nvs-raw">{line.raw}</p>
        <p className="nvs-code">{line.code}</p>
        <p className="nvs-name">{line.en}</p>
        <div className="nvs-gauge" role="img" aria-label={`Charged ${won(line.unit)}. Seoul median ${won(line.median)}, ninetieth percentile ${won(line.p90)}.`}>
          <span className="nvs-over" style={{ left: at(line.p90), width: `calc(${at(line.unit)} - ${at(line.p90)})` }} />
          <span className="nvs-tick" style={{ left: at(line.median) }}><i>median</i><b>{plain(line.median)}</b></span>
          <span className="nvs-tick" style={{ left: at(line.p90) }}><i>P90</i><b>{plain(line.p90)}</b></span>
          <span className="nvs-tick is-price" style={{ left: at(line.unit) }}><i>P{line.pct}</i><b>{plain(line.unit)}</b></span>
        </div>
        <p className="nvs-find"><b>{won(line.risk)}</b> over the region’s 90th percentile</p>
        <p className="nvs-step">{index + 1} / {LINES.length}</p>
      </div>
    )
  }
  return (
    <div className="nvs-read" key={line.code}>
      <p className="nvs-raw">{line.raw}</p>
      <p className="nvs-code is-drug">{line.code.replace('_', ' ')}</p>
      <p className="nvs-name">{line.en}</p>
      <p className="nvs-find is-clear">{line.dose ? line.dose : 'A medicine, not a procedure'}</p>
      <p className="nvs-find is-clear"><b>No finding</b></p>
      <p className="nvs-step">{index + 1} / {LINES.length}</p>
    </div>
  )
}

function Verdict() {
  const paid = (CLAIM.payable / CLAIM.billed) * 100
  return (
    <div className="nvs-verdict">
      <p className="nvs-raw">{CLAIM.id}</p>
      <p className="nvs-decision">Review<span>{CLAIM.decisionKo}</span></p>
      <div className="nvs-bar" role="img" aria-label={`${won(CLAIM.payable)} payable of ${won(CLAIM.billed)} billed`}>
        <span style={{ width: `${paid.toFixed(1)}%` }} />
      </div>
      <p className="nvs-sums"><b>{won(CLAIM.payable)}</b> payable of {won(CLAIM.billed)}</p>
      <p className="nvs-sums">{CLAIM.findings} findings. An adjuster confirms.</p>
    </div>
  )
}

export function Nuvovet() {
  const [read, setRead] = useState(() => new Set())
  const [at, setAt] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const run = useSequence()
  const touched = useRef(false)

  const look = (i) => {
    touched.current = true
    setAt(i)
    setRead((s) => (s.has(i) ? s : new Set(s).add(i)))
  }

  // the laptop's screen is the bright thing once it is on
  useEffect(() => { lamp.duck(open ? 0.45 : 0) }, [open])
  useEffect(() => () => lamp.duck(0), [])

  // once the lid is up it reads the dearest line by itself, so the scene
  // explains itself to somebody who only scrolls
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => {
      if (touched.current) return
      setAt(5)
      setRead((s) => new Set(s).add(5))
    }, 700)
    return () => clearTimeout(timer)
  }, [open])

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
      await wait(260)
    }
    await wait(300)
    setAt(-1)
    setBusy(false)
  })
  const again = () => run(async () => {
    setRead(new Set())
    setAt(-1)
    setBusy(false)
  })

  const caption = done
    ? 'Decision: review. It never denies on its own.'
    : read.size === 0
      ? 'A receipt, as the clinic typed it.'
      : `${COUNT[read.size][0].toUpperCase()}${COUNT[read.size].slice(1)} of eleven lines read.`

  const keys = done
    ? [{ label: 'Again', onPress: again }]
    : [
        { label: 'Read the next line', onPress: next, disabled: busy },
        { label: 'Read all eleven', onPress: all, disabled: busy },
      ]

  const showVerdict = done && at < 0

  return (
    <section className="work" id="nuvovet" aria-labelledby="nuvovet-title" data-lamp-colour="120,160,235,0.5">
      <WorkHead
        id="nuvovet" numeral="II" kind="Venture" year="2026" title="NuvoVet"
        line="A vet’s receipt, read into a decision."
        href="https://www.nuvovet.com" site="nuvovet.com"
      />

      <div className="nv-stage">
        <div className="nv-desk">
          <Lit className="nv-paper-lit" depth="object" lit={open ? 0.55 : 0} data-lamp-rest="0.5 0.4">
            <div className={`nv-paper${done ? ' is-decided' : ''}${busy ? ' is-scanning' : ''}`}>
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
                      onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !busy) look(i) }}
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

          <div className="nv-laptop">
            <Laptop label="NuvoVet Claims, reading the receipt" onOpen={() => setOpen(true)}>
              <div className="nvs">
                <p className="nvs-bar-top"><b>nuvovet</b> Claims<span>synthetic claim</span></p>
                {showVerdict ? <Verdict /> : at >= 0 ? <Reading line={LINES[at]} index={at} /> : (
                  <div className="nvs-wait">
                    <p className="nvs-code">11 lines</p>
                    <p className="nvs-name">waiting to be read</p>
                  </div>
                )}
              </div>
            </Laptop>
          </div>
        </div>

        <Keys caption={caption} keys={keys} />
      </div>
    </section>
  )
}
