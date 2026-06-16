// ui.jsx — warm minimal primitives for CELESTE (galaxy edition).
import * as React from 'react'
import { GalaxyField } from '../galaxy.js'

export function makeColors(palette) {
  const you = (palette && palette[0]) || '#FF8C66'
  const them = (palette && palette[1]) || '#FF5E8A'
  return {
    ink: '#0B0910',
    ink2: '#15111F',
    ink3: '#1E1830',
    cream: '#F4ECE3',
    muted: '#9C90B4',
    line: 'rgba(244,236,227,0.10)',
    you,
    them,
  }
}

export function rgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// warm gradient backdrop for the calm entry screens (no canvas)
export function WarmBg({ C, variant = 'center', children }) {
  const g = {
    center: `radial-gradient(560px 480px at 50% 34%, ${rgba(C.you, 0.18)}, transparent 70%),
             radial-gradient(460px 420px at 82% 96%, ${rgba(C.them, 0.12)}, transparent 72%)`,
    low: `radial-gradient(540px 440px at 50% 90%, ${rgba(C.you, 0.18)}, transparent 72%),
             radial-gradient(380px 340px at 14% 8%, ${rgba(C.them, 0.1)}, transparent 74%)`,
    quiet: `radial-gradient(640px 520px at 50% 16%, ${rgba(C.you, 0.11)}, transparent 72%)`,
  }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.ink }}>
      <div style={{ position: 'absolute', inset: 0, background: g[variant] }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,.5) 100%)' }} />
      {children}
    </div>
  )
}

// React wrapper around the canvas GalaxyField
export function GalaxyCanvas({ mode = 'idle', dim, you, them, motion = 20, seals = 0, style }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  React.useEffect(() => {
    const f = new GalaxyField(ref.current, { you, them, motion })
    field.current = f
    f.setSeals(seals)
    f.setMode(mode, { dim })
    f.start()
    let ro
    if (window.ResizeObserver && ref.current && ref.current.parentElement) {
      ro = new ResizeObserver(() => f.resize())
      ro.observe(ref.current.parentElement)
    }
    const r1 = requestAnimationFrame(() => f.resize())
    return () => {
      if (ro) ro.disconnect()
      cancelAnimationFrame(r1)
      f.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    if (field.current) field.current.setSeals(seals)
  }, [seals])
  React.useEffect(() => {
    if (field.current) field.current.setMode(mode, { dim })
  }, [mode, dim])
  React.useEffect(() => {
    if (field.current) field.current.setMotion(motion)
  }, [motion])
  React.useEffect(() => {
    if (field.current) field.current.setPalette(you, them)
  }, [you, them])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }} />
}

export function Brandmark({ C, size = 14 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: C.you,
          boxShadow: `0 0 12px 2px ${rgba(C.you, 0.7)}`,
          animation: 'breathe 4s ease-in-out infinite',
        }}
      />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: size, letterSpacing: '5px', color: C.cream, paddingLeft: 2 }}>CELESTE</span>
    </div>
  )
}

export function PrimaryButton({ C, children, onClick, disabled, style }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: '100%',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: '17px 22px',
        borderRadius: 15,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '.2px',
        color: disabled ? C.muted : '#1a0f0a',
        background: disabled ? C.ink3 : `linear-gradient(180deg, ${C.you}, ${rgba(C.you, 0.86)})`,
        boxShadow: disabled ? 'none' : `0 10px 30px ${rgba(C.you, h ? 0.42 : 0.28)}, inset 0 1px 0 rgba(255,255,255,.38)`,
        transform: h && !disabled ? 'translateY(-1.5px)' : 'none',
        transition: 'transform .18s, box-shadow .25s, background .2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({ C, children, onClick, style }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 6px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 13.5,
        color: h ? C.cream : C.muted,
        transition: 'color .2s',
        letterSpacing: '.2px',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// unified input. kind: 'email' | 'handle'. emphasis = larger hero styling.
export function Field({ C, kind = 'handle', value, onChange, placeholder, accent, autoFocus, onEnter, emphasis }) {
  const [focus, setFocus] = React.useState(false)
  const col = accent || C.you
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])
  const clean = (v) => (kind === 'email' ? v.replace(/\s/g, '') : v.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: kind === 'email' ? 10 : 4,
        width: '100%',
        padding: emphasis ? '19px 20px' : '15px 17px',
        borderRadius: emphasis ? 17 : 13,
        background: C.ink2,
        border: `1.5px solid ${focus ? rgba(col, 0.8) : emphasis ? rgba(col, 0.28) : C.line}`,
        boxShadow: focus ? `0 0 0 4px ${rgba(col, 0.13)}, 0 0 32px ${rgba(col, 0.16)}` : emphasis ? `0 0 26px ${rgba(col, 0.1)}` : 'none',
        transition: 'border-color .2s, box-shadow .25s',
      }}
    >
      {kind === 'handle' ? (
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: emphasis ? 22 : 19, color: col, fontWeight: 700 }}>@</span>
      ) : (
        <Icon name="mail" size={emphasis ? 21 : 18} color={col} stroke={1.7} />
      )}
      <input
        ref={ref}
        type={kind === 'email' ? 'email' : 'text'}
        inputMode={kind === 'email' ? 'email' : 'text'}
        value={value}
        onChange={(e) => onChange(clean(e.target.value))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontFamily: kind === 'email' ? "'Space Grotesk', sans-serif" : "'Space Mono', monospace",
          fontSize: emphasis ? 19 : 18,
          color: C.cream,
          letterSpacing: '.2px',
          fontWeight: kind === 'email' ? 500 : 400,
        }}
      />
    </div>
  )
}

export function HandleChip({ C, handle, color, big }) {
  const col = color || C.you
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: big ? '8px 15px' : '5px 11px',
        borderRadius: 999,
        background: rgba(col, 0.12),
        border: `1px solid ${rgba(col, 0.42)}`,
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        fontSize: big ? 17 : 13.5,
        color: C.cream,
        maxWidth: '100%',
      }}
    >
      <span style={{ color: col }}>@</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{handle}</span>
    </span>
  )
}

// calm sonar ping — expanding rings + still core (replaces blinking status)
export function Sonar({ C, color, size = 16 }) {
  const col = color || C.you
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      {[0, 1].map((i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: `1px solid ${rgba(col, 0.5)}`,
            animation: `ping 3s ease-out ${i * 1.5}s infinite`,
          }}
        />
      ))}
      <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: col, boxShadow: `0 0 8px 1px ${rgba(col, 0.7)}`, animation: 'breathe 3s ease-in-out infinite' }} />
    </span>
  )
}

export function StepDots({ C, step, n = 2 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 99, background: i === step ? C.you : C.line, transition: 'all .3s' }} />
      ))}
    </div>
  )
}

export function BackBtn({ C, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: C.ink2, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
    >
      <Icon name="back" size={16} color="currentColor" stroke={1.9} />
    </button>
  )
}

export function Icon({ name, size = 16, color = 'currentColor', stroke = 1.8 }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    lock: (
      <>
        <rect x="4" y="9.5" width="12" height="8.5" rx="2.2" {...p} />
        <path d="M6.5 9.5V7a3.5 3.5 0 017 0v2.5" {...p} />
      </>
    ),
    arrow: (
      <>
        <path d="M4 10h11" {...p} />
        <path d="M11 5.5L15.5 10 11 14.5" {...p} />
      </>
    ),
    check: <path d="M4 10.5l4 4 8-9" {...p} />,
    eye: (
      <>
        <path d="M2.5 10S5.5 5 10 5s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z" {...p} />
        <circle cx="10" cy="10" r="2.2" {...p} />
      </>
    ),
    share: (
      <>
        <circle cx="6" cy="10" r="2.2" {...p} />
        <circle cx="14" cy="5" r="2.2" {...p} />
        <circle cx="14" cy="15" r="2.2" {...p} />
        <path d="M8 9l4-2.5M8 11l4 2.5" {...p} />
      </>
    ),
    back: <path d="M12 4l-6 6 6 6" {...p} />,
    mail: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="2.2" {...p} />
        <path d="M3 6l7 5 7-5" {...p} />
      </>
    ),
    star: <path d="M10 2.5l1.6 5 5 .2-4 3.1 1.5 4.9-4.1-3-4.1 3 1.5-4.9-4-3.1 5-.2z" {...p} />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}
