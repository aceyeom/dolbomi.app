import { useState } from 'react'
import { Lit } from '../lamp/Lit.jsx'
import { LightType } from '../type/LightType.jsx'
import { site } from '../data/site.js'
import { hasDb, leaveNote } from '../api/db.js'
import './note.css'

/**
 * The last wall: a note. Three lines and a key. It is kept in the database
 * and nowhere else, and nobody but the room's owner can read one back.
 */
export function Note() {
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

  const shut = state === 'shut'
  return (
    <section className="work note" id="note" aria-labelledby="note-title" data-lamp-colour="255,61,31,0.8">
      <header className="work-head" data-lamp-rest="0.34 0.62">
        <Lit className="work-meta label" depth="text"><span><b>IV</b></span><span>Say something</span></Lit>
        <LightType as="h2" className="work-title note-title is-stack" id="note-title" text="Leave a note" reach={0.6} />
      </header>

      <div className="note-grid">
        {state === 'left' ? (
          <div className="note-form" role="status">
            <p className="line">Left on the table. Thank you.</p>
            <button type="button" className="key" onClick={() => setState('ready')}>Leave another</button>
          </div>
        ) : (
          <form className="note-form" onSubmit={submit} noValidate>
            <label className="field"><span className="label">Name</span>
              <input type="text" name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set('name')} disabled={shut} />
            </label>
            <label className="field"><span className="label">Where to reach you</span>
              <input type="text" name="reach" autoComplete="email" inputMode="email" maxLength={200} value={form.reach} onChange={set('reach')} disabled={shut} />
            </label>
            <label className="field is-wide"><span className="label">The note</span>
              <textarea name="body" rows={3} maxLength={4000} required value={form.body} onChange={set('body')} disabled={shut} />
            </label>
            <input className="sr-only" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={set('company')} />
            <div className="note-foot">
              <button type="submit" className="key" disabled={shut || state === 'sending' || !form.body.trim()}>{state === 'sending' ? 'Leaving it' : 'Leave it'}</button>
              <p className="label" role="status">{shut ? 'Not taking notes just now' : state === 'failed' ? 'It did not go through. Try again.' : ''}</p>
            </div>
          </form>
        )}
        <ul className="note-links">
          {site.links.map((l) => <li key={l.href}><a className="key" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
        </ul>
      </div>
    </section>
  )
}
