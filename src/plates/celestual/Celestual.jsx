import { useEffect, useState } from 'react'
import { Plate, Stage } from '../Plate.jsx'
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

const CAPTIONS = {
  idle: 'Lin has something to say to Kai, and has never said it.',
  writing: 'Lin writes it, and sends it privately.',
  sent: 'Sent, and sealed. Kai is not told that it exists.',
  answering: 'In the same week, without knowing, Kai writes one to Lin.',
  night: 'Every mutual is told on Saturday at nine.',
  mutual: 'It’s mutual. Both find out at the same moment, and each reads the other’s note for the first time.',
  passing: 'Saturday at nine comes, and there is no note from Kai.',
  lapsed: 'Not this time. Kai never knows. The server keeps a name only as a salted one-way hash, so nothing it holds could say.',
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
      : [{ label: 'Start again', onPress: again, disabled: s.busy }]

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
        <p className="cs-who">{me.who}</p>
      </div>
    )
  }

  return (
    <Plate
      id="celestual" numeral="I" title="Celestual"
      lede="A note that is only read if one comes back."
      facts={[
        ['Role', 'Founder'],
        ['Since', '2026'],
        ['Made with', 'React, Postgres on Supabase with row-level security, edge functions, Stripe'],
        ['Standing', 'Live at celestual.us'],
      ]}
      link={{ href: 'https://celestual.us', label: 'celestual.us' }}
      stage={(
        <Stage rest="0.5 0.4" caption={CAPTIONS[said]} keys={keys} label="Celestual, shown on two phones">
          <div className="cs-pair">
            {phone(LIN, KAI, s.lin)}
            {phone(KAI, LIN, s.kai)}
          </div>
        </Stage>
      )}
    >
      <p>
        You send a private note to somebody’s Instagram handle. They are never told. Only if they send one to you
        do you both find out, at the same moment, on Saturday at nine. If it is never mutual, nothing is revealed
        to anybody.
      </p>
      <p>
        Around it stands the wall: short anonymous letters, each one a phone screen left on in a dark room.
      </p>
    </Plate>
  )
}
