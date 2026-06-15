import { useEffect, useState } from 'react'

const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://dolbomi.app'

const OPENERS = [
  "there's a website that tells you if your ex still thinks about you and i've been staring at it for an hour",
  "you both have to enter each other's @. so if it's one-sided… they never know you looked 👀",
  "this only works if we ALL make it go viral — your ex won't show up unless it reaches them 🙏",
]

export default function Result({ matched, them, onReset }) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Let the entrance settle, then "bloom" the verdict.
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120)
    return () => clearTimeout(t)
  }, [])

  async function share() {
    const text = OPENERS[Math.floor(Math.random() * OPENERS.length)]
    const payload = { title: 'STILL.', text, url: SITE }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
    } catch { /* user dismissed — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(`${text}\n${SITE}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* ignore */ }
  }

  if (matched) {
    return (
      <section className={`panel result mutual ${revealed ? 'in' : ''}`} aria-live="polite">
        <div className="bloom" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, k) => (
            <span key={k} className="petal" style={{ '--k': k }}>♥</span>
          ))}
          <span className="bloom-core">♥</span>
        </div>
        <p className="verdict-kicker">it&rsquo;s mutual.</p>
        <h2 className="verdict">@{them}<br />still thinks<br /><em>about you.</em></h2>
        <p className="verdict-sub">They entered you too. You both know now.</p>
        <div className="actions">
          <button className="cta" onClick={share}>
            {copied ? 'copied ✓' : 'tell someone'}
          </button>
          <button className="ghost" onClick={onReset}>check another</button>
        </div>
      </section>
    )
  }

  return (
    <section className={`panel result pending ${revealed ? 'in' : ''}`} aria-live="polite">
      <div className="ember" aria-hidden="true"><span /></div>
      <p className="verdict-kicker">you&rsquo;re in.</p>
      <h2 className="verdict pending-h">if @{them} enters you,<br /><em>you&rsquo;ll both know.</em></h2>
      <p className="verdict-sub">
        Nothing shows on their end. It only counts if they come here and enter
        <i> you</i> — so it has to reach them.
      </p>
      <div className="actions">
        <button className="cta" onClick={share}>
          {copied ? 'copied ✓' : 'make it reach them'}
        </button>
        <button className="ghost" onClick={onReset}>enter another @</button>
      </div>
    </section>
  )
}
