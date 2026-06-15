import { useState } from 'react'

export default function EntryForm({ onSubmit, error }) {
  const [me, setMe] = useState('')
  const [ex, setEx] = useState('')
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  function submit(e) {
    e.preventDefault()
    onSubmit({ me, ex, email })
  }

  return (
    <section className="panel intro">
      <h1 className="hero">
        Does your ex<br />still think<br /><em>about you?</em>
      </h1>
      <p className="sub">
        Enter their @. If they enter yours back, you both find out.
        If it&rsquo;s one-sided&hellip; <b>they never know you looked.</b>
      </p>

      <form className="form" onSubmit={submit} noValidate>
        <label className="field">
          <span>your @</span>
          <div className="at">
            <i>@</i>
            <input
              value={me}
              onChange={(e) => setMe(e.target.value)}
              placeholder="you"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>
        </label>

        <label className="field">
          <span>your ex&rsquo;s @</span>
          <div className="at">
            <i>@</i>
            <input
              value={ex}
              onChange={(e) => setEx(e.target.value)}
              placeholder="them"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>
        </label>

        {showEmail ? (
          <label className="field">
            <span>email <small>— so we can tell you if it&rsquo;s mutual</small></span>
            <div className="at">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </label>
        ) : (
          <button type="button" className="ghost" onClick={() => setShowEmail(true)}>
            + add email so we can tell you if it&rsquo;s mutual
          </button>
        )}

        {error && <p className="err">{error}</p>}

        <button type="submit" className="cta">find out</button>
      </form>

      <p className="fine">
        We never reveal a one-sided entry. The other person only learns anything
        if they independently enter <i>you</i>.
      </p>
    </section>
  )
}
