// screens.jsx — CELESTE (galaxy edition) screens. Responsive: each shell fills the
// viewport and centers a max-width column, so the same flow reads full-bleed on a
// phone and as an intimate centered column on the web. The backgrounds (the
// persistent galaxy + the warm overlay) are owned by App so they never remount
// between screens — these shells only lay out the foreground content.
import * as React from 'react'
import { Brandmark, Sonar, PrimaryButton, GhostButton, Field, HandleChip, StepDots, BackBtn, Icon, rgba } from './ui.jsx'

// Shared centered column: at least one dynamic-viewport tall (so the flex
// spacers fill the screen on phone and desktop alike), but free to grow taller
// when content or an open keyboard demands it — the page scrolls rather than
// clipping. The column is capped so it stays an intimate measure on wide
// monitors instead of stretching edge to edge.
function ShellInner({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'max(40px, env(safe-area-inset-top)) clamp(20px, 5vw, 40px) max(28px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

// Both shells are now just the centered column — App paints the backdrop behind
// them — but the named wrappers are kept so each screen still reads its intent.
const GalaxyShell = ({ children }) => <ShellInner>{children}</ShellInner>
const WarmShell = ({ children }) => <ShellInner>{children}</ShellInner>

// ── 1 · LANDING ──────────────────────────────────────────────
export function LandingScreen({ C, t, ctx }) {
  return (
    <GalaxyShell C={C} t={t} mode="idle" dim={0.62}>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
        <Brandmark C={C} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <h1
          className="enter"
          style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(27px, 8vw, 44px)', lineHeight: 1.16, color: C.cream, textShadow: '0 4px 34px rgba(0,0,0,.7)' }}
        >
          {t.head.map((ln, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap' }}>
              {ln.em ? <em style={{ fontStyle: 'italic', color: C.you }}>{ln.t}</em> : ln.t}
            </div>
          ))}
        </h1>
      </div>

      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PrimaryButton C={C} onClick={() => ctx.go('you')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center', whiteSpace: 'nowrap' }}>
            Find out <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12 }}>
            <Icon name="lock" size={13} color={C.muted} /> anonymous unless mutual
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.line }} />
          <GhostButton C={C} onClick={() => ctx.go('pricing')} style={{ padding: 0, fontSize: 12 }}>
            why it’s free →
          </GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// ── 2 · YOU (email emphasized — so a later match can always reach you) ─────────
export function YouScreen({ C, t, ctx }) {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email.trim())
  const handleOk = ctx.me.trim().length >= 2
  const valid = emailOk && handleOk
  return (
    <WarmShell C={C} variant="quiet">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('landing')} />
        <StepDots C={C} step={0} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          Where do we<br />
          <em style={{ color: C.you }}>reach you?</em>
        </h2>

        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            C={C}
            kind="email"
            value={ctx.email}
            onChange={ctx.setEmail}
            placeholder="you@email.com"
            accent={C.you}
            autoFocus
            emphasis
            onEnter={() => {
              const el = document.querySelector('input[data-handle]')
              if (el) el.focus()
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
            <span style={{ height: 1, flex: 1, background: C.line }} />
            <span style={{ fontSize: 11, color: C.muted, letterSpacing: '1px', fontFamily: "'Space Mono', monospace" }}>AND YOUR HANDLE</span>
            <span style={{ height: 1, flex: 1, background: C.line }} />
          </div>
          <HandleFieldTagged C={C} value={ctx.me} onChange={ctx.setMe} onEnter={() => valid && ctx.go('them')} />
        </div>

        <div className="enter" style={{ animationDelay: '.14s', display: 'flex', alignItems: 'center', gap: 7, color: C.muted, fontSize: 12, padding: '0 2px' }}>
          <Icon name="lock" size={13} color={C.muted} /> Your handle is shown only if it’s mutual.
        </div>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={() => ctx.go('them')}>
        Continue
      </PrimaryButton>
    </WarmShell>
  )
}
// tiny wrapper so the email Enter key can focus the handle input
function HandleFieldTagged({ C, value, onChange, onEnter }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (ref.current) {
      const inp = ref.current.querySelector('input')
      if (inp) inp.setAttribute('data-handle', '1')
    }
  }, [])
  return (
    <div ref={ref}>
      <Field C={C} kind="handle" value={value} onChange={onChange} placeholder="your.handle" accent={C.you} onEnter={onEnter} />
    </div>
  )
}

// ── 3 · THEM ─────────────────────────────────────────────────
export function ThemScreen({ C, t, ctx }) {
  const valid = ctx.them.trim().length >= 2 && ctx.them.trim() !== ctx.me.trim()
  return (
    <WarmShell C={C} variant="low">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('you')} />
        <StepDots C={C} step={1} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          Who can’t you<br />
          <em style={{ color: C.them }}>stop thinking about?</em>
        </h2>
        <div className="enter" style={{ animationDelay: '.08s' }}>
          <Field C={C} kind="handle" value={ctx.them} onChange={ctx.setThem} placeholder="their.handle" accent={C.them} autoFocus emphasis onEnter={() => valid && ctx.seal()} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, color: C.muted, fontSize: 12 }}>
            <Icon name="eye" size={13} color={C.muted} /> No alert. No trace. Invisible unless they enter you back.
          </div>
          {ctx.error && <div style={{ marginTop: 12, color: C.them, fontSize: 13 }}>{ctx.error}</div>}
        </div>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={() => ctx.seal()}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          <Icon name="lock" size={16} color="#1a0f0a" stroke={2} /> Seal it
        </span>
      </PrimaryButton>
    </WarmShell>
  )
}

// ── 4 · SENDOFF (galaxy payoff — App routes onward when the lookup returns) ────
export function SendoffScreen({ C, t }) {
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    const a = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(a)
  }, [])
  return (
    <GalaxyShell C={C} t={t} mode="sendoff">
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center', minHeight: 92, transition: 'opacity .8s ease', opacity: show ? 1 : 0 }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: C.cream }}>Sealed.</div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>your star · out there now</div>
      </div>
      <div style={{ flex: 1 }} />
    </GalaxyShell>
  )
}

// ── 5 · RESTING (your star joins the field — the pending forward-loop) ─────
export function RestingScreen({ C, t, ctx }) {
  return (
    <GalaxyShell C={C} t={t} mode="resting">
      <div className="enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brandmark C={C} size={13} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '1.5px' }}>LISTENING</span>
          <Sonar C={C} color={C.you} size={16} />
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 150 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 7vw, 38px)', lineHeight: 1.14, color: C.cream }}>
          It’s out there now.
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14, lineHeight: 1.55, color: C.muted, maxWidth: 300 }}>
          Your star is in the sky. We’ll tell you the moment <HandleChip C={C} handle={ctx.them || 'them'} color={C.them} /> looks back.
        </p>
      </div>

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 28 }}>
        <GhostButton C={C} onClick={() => ctx.checkAnother()}>
          check someone else →
        </GhostButton>
        {/* DEMO ONLY — preview the mutual reveal. Remove before launch. */}
        <button
          onClick={() => ctx.previewMatch()}
          style={{
            background: 'none',
            border: `1px dashed ${rgba(C.them, 0.4)}`,
            borderRadius: 999,
            cursor: 'pointer',
            padding: '7px 14px',
            color: C.muted,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: '.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Icon name="eye" size={13} color={C.them} /> demo · see a match
        </button>
      </div>
    </GalaxyShell>
  )
}

// ── 6 · MATCH (galaxy dims, two linked stars) ────────────────
export function MatchScreen({ C, t, ctx }) {
  return (
    <GalaxyShell C={C} t={t} mode="match">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 420 }}>
        <div className="enter" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '4px', textTransform: 'uppercase', color: C.you, marginBottom: 12 }}>✦ it’s mutual</div>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 8vw, 42px)', lineHeight: 1.1, color: C.cream }}>
            They still think<br />
            <em style={{ color: C.them }}>about you too.</em>
          </h1>
        </div>
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <HandleChip C={C} handle={ctx.me || 'you'} color={C.you} big />
          <span style={{ color: C.muted, fontSize: 15 }}>✦</span>
          <HandleChip C={C} handle={ctx.them || 'them'} color={C.them} big />
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryButton C={C} onClick={() => ctx.openConversation()}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            Open the conversation <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('resting')}>
            not yet
          </GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// ── 7 · PRICING ──────────────────────────────────────────────
export function PricingScreen({ C, t, ctx }) {
  const Line = ({ label, note, value, accent, last }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
        padding: '20px 0',
        borderBottom: last ? 'none' : `1px solid ${C.line}`,
      }}
    >
      <div>
        <div style={{ fontSize: 15, color: C.cream, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{note}</div>
      </div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: accent || C.cream, whiteSpace: 'nowrap', lineHeight: 1 }}>{value}</div>
    </div>
  )
  return (
    <WarmShell C={C} variant="quiet">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.sealedAt ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.16, color: C.cream }}>
          We charge for the <em style={{ color: C.you }}>curiosity</em> — never the feelings.
        </h2>

        <div className="enter" style={{ animationDelay: '.08s' }}>
          <Line label="Your first ping" note="One person, on us." value="Free" accent={C.you} />
          <Line label="Each extra person" note="The next one you can’t shake." value="$2.99" />
          <Line label="The reveal" note="The answer is never paywalled." value="Free" accent={C.you} last />
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.16s' }}>
        <PrimaryButton C={C} onClick={() => (ctx.sealedAt ? ctx.checkAnother() : ctx.go('you'))}>{ctx.sealedAt ? 'Check another person' : 'Start with my free one'}</PrimaryButton>
      </div>
    </WarmShell>
  )
}
