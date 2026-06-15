import { useEffect, useState } from 'react'

const LINES = [
  'looking…',
  'checking if they came back…',
  'this stays between us…',
  'almost…',
]

export default function Scanner({ them }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 700)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="panel scanner" aria-live="polite">
      <div className="orb">
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <span className="core" />
      </div>
      <p className="scan-line">{LINES[i]}</p>
      <p className="scan-sub">@{them}</p>
    </section>
  )
}
