import { useEffect, useRef, useState } from 'react'
import { WorkHead, Keys } from '../../chrome/WorkHead.jsx'
import { Wall } from '../../wall/Wall.jsx'
import { Lit } from '../../lamp/Lit.jsx'
import { lamp } from '../../lamp/lamp.js'
import { useSequence } from '../../lib/sequence.js'
import { Screen } from './Screen.jsx'
import '../../styles/celestual.css'

// The two notes are the ones in Celestual's own film (reel/DESIGN.md): lin's
// in ice, kai's in amber. Product copy is lowercase, as the product writes.
const LIN = { who: 'lin', to: 'kai', colour: 'ice', stamp: '10/06/26', words: 'i never said this two years ago. i loved you. maybe i still do.' }
const KAI = { who: 'kai', to: 'lin', colour: 'amber', stamp: '10/08/26', words: 'i was waiting for you to say it first.' }

const DARK = { power: 'off', face: 'note', typed: 0, writing: false, shows: 'own' }
const START = { stage: 'idle', busy: false, lin: DARK, kai: DARK }

const SAID = {
  idle: 'Lin has never said it.',
  writing: 'Lin writes it, and sends it privately.',
  sent: 'Sealed. Kai is never told.',
  answering: 'Not knowing, Kai writes one too.',
  night: 'Saturday, nine.',
  mutual: 'It’s mutual. Both find out at once.',
  passing: 'Saturday comes. Nothing from Kai.',
  lapsed: 'Not this time. Kai never knows.',
}

/** The film Celestual made for itself, silent, on a loop, playing only while it is in the window. */
function Film() {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v || typeof IntersectionObserver !== 'function') return undefined
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !still.matches) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.35 })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <figure className="cs-film">
      <video ref={ref} src="/media/celestual-reel.mp4" poster="/media/celestual-reel.jpg" muted loop playsInline preload="none" width="540" height="960" aria-label="Celestual’s film: a letter is written, sent privately, and found to be mutual" />
      <figcaption className="label"><b>The film</b><span>35 s</span></figcaption>
    </figure>
  )
}

export function Celestual() {
  const [s, setS] = useState(START)
  const [said, setSaid] = useState('idle')
  const run = useSequence()
  const patch = (who, next) => setS((v) => ({ ...v, [who]: { ...v[who], ...next } }))

  // a screen that is lit is the bright thing, and the lamp gives way to it
  const lit = (p) => (p.power === 'on' ? 1 : p.power === 'standby' ? 0.3 : 0)
  const glow = Math.max(lit(s.lin), lit(s.kai))
  useEffect(() => { lamp.duck(glow) }, [glow])
  useEffect(() => () => lamp.duck(0), [])

  const sendLin = () => run(async ({ wait, type }) => {
    setS((v) => ({ ...v, busy: true }))
    setSaid('writing')
    patch('lin', { power: 'on', face: 'note', shows: 'own', typed: 0, writing: true })
    await wait(520)
    await type(LIN.words.length, (n) => patch('lin', { typed: n }))
    await wait(900)
    patch('lin', { power: 'standby', face: 'sealed', writing: false })
    setSaid('sent')
    setS((v) => ({ ...v, stage: 'sent', busy: false }))
  })

  const sendKai = () => run(async ({ wait, type }) => {
    setS((v) => ({ ...v, busy: true }))
    setSaid('answering')
    patch('kai', { power: 'on', face: 'note', shows: 'own', typed: 0, writing: true })
    await wait(520)
    await type(KAI.words.length, (n) => patch('kai', { typed: n }))
    await wait(900)
    patch('kai', { power: 'standby', face: 'sealed', writing: false })
    await wait(1100)
    setSaid('night')
    patch('lin', { face: 'clock' })
    patch('kai', { face: 'clock' })
    await wait(1700)
    // the two come on together, and each has the other's note on it
    patch('lin', { power: 'on', face: 'note', shows: 'theirs' })
    patch('kai', { power: 'on', face: 'note', shows: 'theirs' })
    setSaid('mutual')
    setS((v) => ({ ...v, stage: 'mutual', busy: false }))
  })

  const saturday = () => run(async ({ wait }) => {
    setS((v) => ({ ...v, busy: true }))
    setSaid('passing')
    patch('lin', { face: 'clock' })
    await wait(1900)
    patch('lin', { power: 'off' })
    await wait(700)
    setSaid('lapsed')
    setS((v) => ({ ...v, stage: 'lapsed', busy: false }))
  })

  const again = () => run(async () => {
    setS(START)
    setSaid('idle')
  })

  const keys = s.stage === 'idle'
    ? [{ label: 'Send Lin’s note', onPress: sendLin, disabled: s.busy }]
    : s.stage === 'sent'
      ? [
          { label: 'Kai sends one too', onPress: sendKai, disabled: s.busy },
          { label: 'Saturday comes without one', onPress: saturday, disabled: s.busy },
        ]
      : [{ label: 'Again', onPress: again, disabled: s.busy }]

  const phone = (me, other, p) => {
    const note = p.shows === 'theirs' ? other : me
    const full = p.shows === 'theirs' || p.face !== 'note'
    const state = p.power === 'off' ? 'off, dark' : p.face === 'sealed' ? 'a sealed note, waiting' : p.face === 'clock' ? 'Saturday, 9:00 pm' : `a note to ${note.to}: ${note.words.slice(0, full ? undefined : p.typed)}`
    return (
      <div className={`cs-phone${p.power === 'on' ? ' is-lit' : ''}`}>
        <Lit depth="object" lit={p.power === 'off' ? 0 : 1}>
          <Screen
            power={p.power} face={p.face} colour={note.colour} stamp={note.stamp} dear={note.to}
            words={note.words} typed={full ? note.words.length : p.typed} writing={p.writing}
            line="sent privately."
            label={`${me.who}’s phone: ${state}`}
          />
        </Lit>
        <p className="cs-who label">{me.who}</p>
      </div>
    )
  }

  return (
    <section className="work" id="celestual" aria-labelledby="celestual-title" data-lamp-colour="143,184,220,0.5">
      <WorkHead
        id="celestual" numeral="I" kind="Venture" year="2026" title="Celestual"
        line="A note that is only read if one comes back."
        href="https://celestual.us" site="celestual.us"
      />

      <Wall />

      <div className="cs-how">
        <div className="cs-demo" data-lamp-rest="0.5 0.36">
          <p className="label cs-demo-label"><b>How it works</b><span>Two phones</span></p>
          <div className="cs-pair">
            {phone(LIN, KAI, s.lin)}
            {phone(KAI, LIN, s.kai)}
          </div>
          <Keys caption={SAID[said]} keys={keys} />
        </div>
        <Film />
      </div>
    </section>
  )
}
