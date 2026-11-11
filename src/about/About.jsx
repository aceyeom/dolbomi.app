import { useState } from 'react'
import { Lit } from '../lamp/Lit.jsx'
import { site } from '../data/site.js'
import { hasDb, leaveNote } from '../api/db.js'
import '../styles/about.css'

/**
 * The note: three lines and a key. It is kept in the database and nowhere
 * else, and nobody but the room's owner can read one back (the table takes
 * an insert from a visitor and answers nothing).
 */
function Note() {
  const [state, setState] = useState(hasDb ? 'ready' : 'shut') // ready | sending | left | failed | shut
  const [form, setForm] = useState({ name: '', reach: '', body: '', company: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (state === 'sending' || !form.body.trim()) return
    // a field no person can see or reach: whatever fills it in is not one
    if (form.company) { setState('left'); return }
    setState('sending')
    try {
      await leaveNote(form)
      setState('left')
      setForm({ name: '', reach: '', body: '', company: '' })
    } catch {
      setState('failed')
    }
  }

  if (state === 'left') {
    return (
      <div className="note" role="status">
        <p className="note-left">Left on the table. Thank you.</p>
        <button type="button" className="key" onClick={() => setState('ready')}>Leave another</button>
      </div>
    )
  }

  const shut = state === 'shut'
  return (
    <form className="note" onSubmit={submit} noValidate>
      <label className="field">
        <span>Your name</span>
        <input type="text" name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set('name')} disabled={shut} />
      </label>
      <label className="field">
        <span>Where to reach you</span>
        <input type="text" name="reach" autoComplete="email" inputMode="email" maxLength={200} value={form.reach} onChange={set('reach')} disabled={shut} />
      </label>
      <label className="field">
        <span>The note</span>
        <textarea name="body" rows={4} maxLength={4000} required value={form.body} onChange={set('body')} disabled={shut} />
      </label>
      <input className="sr-only" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={set('company')} />
      <div className="note-foot">
        <button type="submit" className="key" disabled={shut || state === 'sending' || !form.body.trim()}>
          {state === 'sending' ? 'Leaving it' : 'Leave it'}
        </button>
        <p className="caption" role="status">
          {shut ? 'Notes are not being taken just now.' : state === 'failed' ? 'It did not go through. Try once more in a moment.' : ''}
        </p>
      </div>
    </form>
  )
}

export function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="wrap about-grid">
        <Lit className="about-text" depth="text">
          <h2 className="about-title" id="about-title">About</h2>
          <p className="about-lede">
            I am {site.name}. I founded Celestual and NuvoVet, and this room holds those two and whatever else I make.
          </p>
          <ul className="about-links">
            {site.links.map((l) => (
              <li key={l.href}><a className="link" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
            ))}
          </ul>
        </Lit>

        <Lit className="about-note" depth="text" data-lamp-rest="0.4 0.4">
          <h2 className="about-title">Leave a note</h2>
          <Note />
        </Lit>
      </div>
    </section>
  )
}
