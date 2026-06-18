// screens.jsx — CELESTE (galaxy edition) screens. Responsive by construction:
// every shell fills the viewport and centers a capped column, so the same flow
// reads full-bleed on a phone and as an intimate centered column on the web. The
// backgrounds (the persistent galaxy + the calm overlay) are owned by App so
// they never remount between screens — these shells only lay out the foreground.
//
// All user-facing copy comes through useI18n().t(); all color comes through C
// (the single theme). Nothing here defines its own hex or hard-codes English.
import * as React from 'react'
import { normHandle } from '../api/still.js'
import { useI18n } from '../i18n/index.js'
import { PRICE_LABEL } from '../api/pay.js'
import {
  Brandmark, PrimaryButton, GhostButton, Field, HandleChip, HandleSearchField,
  StepDots, BackBtn, Icon, Sonar, rgba,
} from './ui.jsx'

// Shared centered column: at least one dynamic-viewport tall (so the flex spacers
// fill phone and desktop alike), free to grow taller and scroll when content or
// an open keyboard demands it, and capped so it stays an intimate measure on wide
// monitors instead of stretching edge to edge.
function ShellInner({ children, onBackdropTap }) {
  return (
    <div
      onClick={onBackdropTap}
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

const GalaxyShell = ({ children, onBackdropTap }) => <ShellInner onBackdropTap={onBackdropTap}>{children}</ShellInner>
const WarmShell = ({ children }) => <ShellInner>{children}</ShellInner>

// ── 0 · AUTH (Meta gate — up front, except on /demo) ──────────────────────────
export function AuthScreen({ C, ctx }) {
  const { t } = useI18n()
  const [busy, setBusy] = React.useState(false)
  const signIn = async () => {
    if (busy) return
    setBusy(true)
    try {
      await ctx.signIn()
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
  }
  return (
    <WarmShell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
        <Brandmark C={C} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
        <h1 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(28px, 8vw, 40px)', lineHeight: 1.16, color: C.cream }}>
          {t('auth.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14.5, lineHeight: 1.6, color: C.muted }}>
          {t('auth.sub')}
        </p>
      </div>
      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PrimaryButton C={C} onClick={signIn} disabled={busy}>
          {t('auth.cta')}
        </PrimaryButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.muted }}>{t('auth.why')}</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <GhostButton C={C} onClick={() => ctx.enterDemo()}>{t('auth.demo')}</GhostButton>
        </div>
      </div>
    </WarmShell>
  )
}

// ── 0.5 · INTRO (motion-graphic explainer for new users) ──────────────────────
// A short, staged story: you enter someone → an anonymous star drifts up → if
// they never enter you, nothing happens → if they do, the two stars collide and
// become one. The galaxy behind plays the matching mode; this layer narrates.
const INTRO_STEPS = ['intro.s1', 'intro.s2', 'intro.s3', 'intro.s4', 'intro.s5']
export function IntroScreen({ C, ctx }) {
  const { t } = useI18n()
  const [i, setI] = React.useState(0)
  const last = INTRO_STEPS.length - 1
  // Advance one beat — past the final beat the slideshow hands off into the flow.
  // Used by both the gentle auto-play timer and a tap anywhere on the field, so
  // tapping skips ahead through the slides (there is no separate "skip" control).
  const advance = React.useCallback(() => {
    setI((n) => {
      if (n >= last) {
        ctx.finishIntro()
        return n
      }
      return n + 1
    })
  }, [ctx, last])
  React.useEffect(() => {
    const id = setTimeout(advance, i === 0 ? 3200 : 3800)
    return () => clearTimeout(id)
  }, [i, advance])
  // tell App which galaxy mode to play behind each beat (collision on the last two)
  React.useEffect(() => {
    ctx.onIntroStep?.(i)
  }, [i, ctx])
  return (
    <GalaxyShell onBackdropTap={advance}>
      <div style={{ minHeight: 34 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <p key={i} className="intro-line" style={{ margin: 0, maxWidth: 360, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(24px, 6.5vw, 32px)', lineHeight: 1.3, color: C.cream, textShadow: '0 4px 30px rgba(0,0,0,.6)' }}>
          {t(INTRO_STEPS[i])}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {INTRO_STEPS.map((_, k) => (
            <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 99, background: k === i ? C.you : C.line, transition: 'all .3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.muted, letterSpacing: '.4px', fontFamily: "'Space Mono', monospace" }}>
          {i >= last ? t('intro.tapBegin') : t('intro.tapNext')}
        </span>
      </div>
    </GalaxyShell>
  )
}

// ── 1 · LANDING ──────────────────────────────────────────────
export function LandingScreen({ C, t: screenT, ctx }) {
  const { t } = useI18n()
  const head = [t('landing.head1'), t('landing.head2')]
  // "Find out" now opens the explainer slideshow, which hands into the flow.
  const start = () => ctx.findOut()
  return (
    <GalaxyShell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
        <Brandmark C={C} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <h1
          className="enter"
          style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(27px, 8vw, 44px)', lineHeight: 1.16, color: C.cream, textShadow: '0 4px 34px rgba(0,0,0,.7)' }}
        >
          <div style={{ whiteSpace: 'nowrap' }}>{head[0]}</div>
          <div style={{ whiteSpace: 'nowrap' }}><em style={{ fontStyle: 'italic', color: C.you }}>{head[1]}</em></div>
        </h1>
      </div>

      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PrimaryButton C={C} onClick={start}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center', whiteSpace: 'nowrap' }}>
            {t('landing.cta')} <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12 }}>
            <Icon name="lock" size={13} color={C.muted} /> {t('landing.anon')}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.line }} />
          {/* replaces the old "why it's free →" — a replayable intro instead */}
          <GhostButton C={C} onClick={() => ctx.watchIntro()} style={{ padding: 0, fontSize: 12 }}>
            {t('landing.watch')} →
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: C.muted }}>
          {t('landing.age')}{' '}
          <button
            onClick={() => ctx.go('privacy')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.you, fontSize: 11, textDecoration: 'underline' }}
          >
            {t('landing.terms')}
          </button>
          .
        </p>
      </div>
    </GalaxyShell>
  )
}

// ── 2 · YOU ───────────────────────────────────────────────────
export function YouScreen({ C, ctx }) {
  const { t } = useI18n()
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email.trim())
  const handleOk = ctx.me.trim().length >= 2
  // If verified via Meta, email is optional (we can reach them in-app).
  const valid = handleOk && (ctx.verified || emailOk)
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('landing')} />
        <StepDots C={C} step={0} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {t('you.title1')}<br />
          <em style={{ color: C.you }}>{t('you.title2')}</em>
        </h2>

        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            C={C}
            kind="email"
            value={ctx.email}
            onChange={ctx.setEmail}
            placeholder={t('you.email')}
            accent={C.you}
            autoFocus={!ctx.verified}
            emphasis
            onEnter={() => {
              const el = document.querySelector('input[data-handle]')
              if (el) el.focus()
            }}
          />
          {ctx.verified && (
            <div style={{ fontSize: 11.5, color: C.muted, padding: '0 4px' }}>{t('auth.notifyOff')}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
            <span style={{ height: 1, flex: 1, background: C.line }} />
            <span style={{ fontSize: 11, color: C.muted, letterSpacing: '1px', fontFamily: "'Space Mono', monospace" }}>{t('you.and')}</span>
            <span style={{ height: 1, flex: 1, background: C.line }} />
          </div>
          <HandleFieldTagged C={C} value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} onEnter={() => valid && ctx.go('them')} />
        </div>

        <div className="enter" style={{ animationDelay: '.14s', display: 'flex', alignItems: 'flex-start', gap: 7, color: C.muted, fontSize: 12, padding: '0 2px' }}>
          <Icon name="mail" size={14} color={C.muted} />
          <span>{t('you.note')}</span>
        </div>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={() => ctx.go('them')}>
        {t('you.continue')}
      </PrimaryButton>
    </WarmShell>
  )
}
function HandleFieldTagged({ C, value, onChange, placeholder, onEnter }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (ref.current) {
      const inp = ref.current.querySelector('input')
      if (inp) inp.setAttribute('data-handle', '1')
    }
  }, [])
  return (
    <div ref={ref}>
      <Field C={C} kind="handle" value={value} onChange={onChange} placeholder={placeholder} accent={C.you} onEnter={onEnter} />
    </div>
  )
}

// ── 3 · THEM (with @ search typeahead) ────────────────────────
export function ThemScreen({ C, ctx }) {
  const { t } = useI18n()
  const valid = ctx.them.trim().length >= 2 && ctx.them.trim() !== ctx.me.trim()
  const [confirming, setConfirming] = React.useState(false)
  const normd = normHandle(ctx.them)
  const onSeal = () => {
    if (!valid) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    ctx.seal()
  }
  React.useEffect(() => {
    setConfirming(false)
  }, [ctx.them])

  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('you')} />
        <StepDots C={C} step={1} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {t('them.title1')}<br />
          <em style={{ color: C.them }}>{t('them.title2')}</em>
        </h2>
        <div className="enter" style={{ animationDelay: '.08s' }}>
          <HandleSearchField C={C} value={ctx.them} onChange={ctx.setThem} placeholder={t('them.handle')} accent={C.them} autoFocus onEnter={onSeal} />
          {/* The note and the confirm prompt share this line, crossfading in
              place — the confirmation is woven into the same quiet copy slot
              instead of popping a bordered box on top of the layout. */}
          {confirming && valid ? (
            <div key="confirm" className="fade" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 7px', marginTop: 14, color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
              <Icon name="lock" size={13} color={rgba(C.them, 0.85)} />
              <span>{t('them.confirm1')}</span>
              <HandleChip C={C} handle={normd} color={C.them} />
              <span>{t('them.confirm2')}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, color: C.muted, fontSize: 12 }}>
              <Icon name="eye" size={13} color={C.muted} /> {t('them.note')}
            </div>
          )}
          {ctx.error && <div style={{ marginTop: 12, color: C.them, fontSize: 13 }}>{ctx.error}</div>}
        </div>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={onSeal}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          <Icon name="lock" size={16} color="#1a0f0a" stroke={2} /> {confirming ? t('them.sealYes') : t('them.seal')}
        </span>
      </PrimaryButton>
    </WarmShell>
  )
}

// ── 4 · SENDOFF ───────────────────────────────────────────────
export function SendoffScreen({ C }) {
  const { t } = useI18n()
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    const a = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(a)
  }, [])
  return (
    <GalaxyShell>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center', minHeight: 92, transition: 'opacity .8s ease', opacity: show ? 1 : 0 }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: C.cream }}>{t('sendoff.sealed')}</div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>{t('sendoff.sub')}</div>
      </div>
      <div style={{ flex: 1 }} />
    </GalaxyShell>
  )
}

// ── 5 · RESTING (interactive field — tap a star to look closer) ────────────
export function RestingScreen({ C, ctx }) {
  const { t } = useI18n()
  const zoomed = ctx.zoomed
  // Tap anywhere on the field: if it lands on a star, the camera drifts in.
  const onBackdropTap = (e) => {
    if (e.target.closest('button, a, input')) return // don't hijack controls
    ctx.onStarTap(e.clientX, e.clientY)
  }
  // When the camera drifts into a star, the whole "It's out there" layer fades
  // away (and stops catching taps) so it never sits over the close-up or the
  // star's card; it eases back in when the camera pulls out.
  const veil = {
    opacity: zoomed ? 0 : 1,
    transform: zoomed ? 'translateY(8px)' : 'none',
    pointerEvents: zoomed ? 'none' : 'auto',
    transition: 'opacity .5s ease, transform .5s ease',
  }
  return (
    <GalaxyShell onBackdropTap={zoomed ? undefined : onBackdropTap}>
      <div className="enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...veil }}>
        <Brandmark C={C} size={13} />
      </div>

      <div style={{ flex: 1, minHeight: 150 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, ...veil }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 7vw, 38px)', lineHeight: 1.14, color: C.cream }}>
          {t('resting.title')}
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14, lineHeight: 1.55, color: C.muted, maxWidth: 320 }}>
          {t('resting.body1')}{' '}
          <HandleChip C={C} handle={ctx.them || 'them'} color={C.them} /> {t('resting.body2')}
        </p>
        {ctx.sealCount > 0 && (
          <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.3px' }}>
            ✦ {t('resting.tapHint')}
          </span>
        )}
      </div>

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 28, ...veil }}>
        <GhostButton C={C} onClick={() => ctx.checkAnother()}>
          {t('resting.another')}
        </GhostButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ctx.canWithdraw && (
            <GhostButton C={C} onClick={() => ctx.withdrawLast()} style={{ padding: 0, fontSize: 11, color: C.muted }}>
              {t('resting.withdraw')}
            </GhostButton>
          )}
          <GhostButton C={C} onClick={() => ctx.forget()} style={{ padding: 0, fontSize: 11, color: C.muted }}>
            {t('resting.forget')}
          </GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// Star detail overlay — rendered by App on top of the focused galaxy. A calm
// sheet that rises from the bottom on phones and settles as a centered card on
// wider screens. Styled from the same tokens as every other surface (ink glass,
// the shared Sonar ping, a hairline divider) so it reads as one product — and
// it only ever shows while the camera is zoomed in, so it never overlaps the
// "It's out there" layer (which fades out on zoom).
export function StarDetail({ C, info, lang, onRemove, onClose }) {
  const { t } = useI18n()
  const [removing, setRemoving] = React.useState(false)
  if (!info) return null
  const when = info.time ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(info.time)) : null
  const remove = () => {
    if (removing) return
    setRemoving(true)
    onRemove()
  }
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 'clamp(0px, 4vw, 6vh)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="enter"
        style={{
          width: '100%', maxWidth: 400, padding: '14px 24px max(24px, env(safe-area-inset-bottom))',
          borderRadius: 'clamp(20px, 5vw, 26px)', background: rgba(C.ink2, 0.86), border: `1px solid ${C.line}`,
          boxShadow: '0 -16px 70px rgba(0,0,0,.55)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        {/* grabber — the one consistent affordance for a sheet you can dismiss */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <span style={{ width: 38, height: 4, borderRadius: 99, background: C.line }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted }}>
            {t('star.kicker')}
          </div>
          {info.handle ? (
            <HandleChip C={C} handle={info.handle} color={C.them} big />
          ) : (
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: C.cream }}>✦</span>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: C.you, fontFamily: "'Space Mono', monospace", letterSpacing: '.3px' }}>
            <Sonar C={C} color={C.you} size={14} />
            {t('star.waiting')}
          </div>
          {when && <div style={{ fontSize: 12, color: C.muted }}>{t('star.registered')} · {when}</div>}
        </div>

        <div style={{ height: 1, background: C.line, margin: '20px 0 16px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <GhostButton
            C={C}
            onClick={remove}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: removing ? C.muted : C.them, fontSize: 13.5 }}
          >
            <Icon name="trash" size={15} color="currentColor" /> {removing ? t('star.removing') : t('star.remove')}
          </GhostButton>
          <GhostButton C={C} onClick={onClose} style={{ padding: '6px', fontSize: 12, color: C.muted }}>
            {t('star.keep')}
          </GhostButton>
        </div>
      </div>
    </div>
  )
}

// ── 6 · MATCH ─────────────────────────────────────────────────
export function MatchScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <GalaxyShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 420 }}>
        <div className="enter" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '4px', textTransform: 'uppercase', color: C.you, marginBottom: 12 }}>{t('match.kicker')}</div>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 8vw, 42px)', lineHeight: 1.1, color: C.cream }}>
            {t('match.title1')}<br />
            <em style={{ color: C.them }}>{t('match.title2')}</em>
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
            {t('match.open')} <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: C.muted }}>{t('match.note')}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('resting')}>{t('match.notyet')}</GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// ── 7 · PRICING (first free, pay to add more — never on /demo) ─────────────
export function PricingScreen({ C, ctx }) {
  const { t } = useI18n()
  const Line = ({ label, note, value, accent, last }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '20px 0', borderBottom: last ? 'none' : `1px solid ${C.line}` }}>
      <div>
        <div style={{ fontSize: 15, color: C.cream, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{note}</div>
      </div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: accent || C.cream, whiteSpace: 'nowrap', lineHeight: 1 }}>{value}</div>
    </div>
  )
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.sealedAt ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.16, color: C.cream }}>
          {t('pricing.title1')} <em style={{ color: C.you }}>{t('pricing.titleEm')}</em>.
        </h2>

        <div className="enter" style={{ animationDelay: '.08s' }}>
          <Line label={t('pricing.firstLabel')} note={t('pricing.firstNote')} value={t('pricing.firstValue')} accent={C.you} />
          <Line label={t('pricing.moreLabel')} note={t('pricing.moreNote')} value={ctx.demo ? t('pricing.firstValue') : PRICE_LABEL} accent={ctx.demo ? C.you : C.them} />
          <Line label={t('pricing.revealLabel')} note={t('pricing.revealNote')} value={t('pricing.revealValue')} accent={C.you} last />
        </div>

        <p className="enter" style={{ animationDelay: '.12s', margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.muted }}>
          {ctx.demo ? t('pricing.demoNote') : t('pricing.foot')}
        </p>
      </div>

      <div className="enter" style={{ animationDelay: '.16s' }}>
        <PrimaryButton C={C} onClick={() => (ctx.sealedAt ? ctx.checkAnother() : ctx.go('you'))}>
          {ctx.sealedAt ? t('pricing.payCta') : t('pricing.startCta')}
        </PrimaryButton>
      </div>
    </WarmShell>
  )
}

// ── 7.5 · CHECKOUT (paywall — Stripe + Kakao/Toss) ────────────────────────
export function CheckoutScreen({ C, ctx }) {
  const { t } = useI18n()
  const [busy, setBusy] = React.useState('')
  const pay = async (provider) => {
    if (busy) return
    setBusy(provider)
    try {
      await ctx.startCheckout(provider)
    } catch (e) {
      console.error(e)
      setBusy('')
    }
  }
  const Method = ({ provider, label, brand }) => (
    <button
      onClick={() => pay(provider)}
      disabled={!!busy}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '15px 18px',
        borderRadius: 13, cursor: busy ? 'default' : 'pointer', border: 'none',
        background: brand, color: '#1a0f0a', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
        opacity: busy && busy !== provider ? 0.5 : 1,
      }}
    >
      {busy === provider ? '…' : label}
    </button>
  )
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('resting')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.16, color: C.cream }}>
          {t('pay.title')}
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14, lineHeight: 1.55, color: C.muted }}>
          {t('pay.sub')} <span style={{ color: C.you, fontWeight: 600 }}>{PRICE_LABEL}</span>.
        </p>
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Method provider="stripe" label={t('pay.stripe')} brand={`linear-gradient(180deg, ${C.you}, ${rgba(C.you, 0.86)})`} />
          <Method provider="kakao" label={t('pay.kakao')} brand="#FEE500" />
          <Method provider="toss" label={t('pay.toss')} brand="#9BC1FF" />
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('pay.secure')}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GhostButton C={C} onClick={() => ctx.go('resting')}>{t('pay.cancel')}</GhostButton>
      </div>
    </WarmShell>
  )
}

// ── 8 · PRIVACY & TERMS ───────────────────────────────────────
export function PrivacyScreen({ C, ctx }) {
  const { t } = useI18n()
  const [handle, setHandle] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const ok = handle.trim().length >= 2
  const submit = async () => {
    if (!ok || status === 'working') return
    setStatus('working')
    try {
      await ctx.suppressHandle(handle)
      setStatus('done')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }
  const H = ({ children }) => (
    <h3 style={{ margin: '20px 0 6px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>{children}</h3>
  )
  const P = ({ children }) => <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted }}>{children}</p>

  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.sealedAt ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 }}>
        <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.16, color: C.cream }}>
          {t('privacy.title')}
        </h2>

        <H>{t('privacy.h1')}</H>
        <P>{t('privacy.p1')}</P>
        <H>{t('privacy.h2')}</H>
        <P>{t('privacy.p2')}</P>
        <H>{t('privacy.h3')}</H>
        <P>{t('privacy.p3')}</P>
        <H>{t('privacy.h4')}</H>
        <P>
          {t('privacy.p4a')}{' '}
          <a href="mailto:privacy@dolbomi.app" style={{ color: C.you }}>privacy@dolbomi.app</a>.
        </P>

        <H>{t('privacy.h5')}</H>
        <P>{t('privacy.p5')}</P>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field C={C} kind="handle" value={handle} onChange={setHandle} placeholder={t('privacy.removePlaceholder')} accent={C.them} />
          <PrimaryButton C={C} disabled={!ok || status === 'working'} onClick={submit}>
            {status === 'working' ? t('privacy.removing') : t('privacy.removeCta')}
          </PrimaryButton>
          {status === 'done' && (
            <P>
              {t('privacy.removed1')} <HandleChip C={C} handle={normHandle(handle)} color={C.them} /> {t('privacy.removed2')}
            </P>
          )}
          {status === 'error' && <div style={{ fontSize: 13, color: C.them }}>{t('privacy.removeErr')}</div>}
        </div>

        <H>{t('privacy.h6')}</H>
        <div style={{ marginTop: 6 }}>
          <GhostButton C={C} onClick={() => ctx.forget()} style={{ padding: 0, fontSize: 13, color: C.you }}>
            {t('privacy.forget')}
          </GhostButton>
        </div>

        <p style={{ margin: '22px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          {t('privacy.foot')} <a href="mailto:privacy@dolbomi.app" style={{ color: C.muted }}>privacy@dolbomi.app</a>.
        </p>
      </div>
    </WarmShell>
  )
}
