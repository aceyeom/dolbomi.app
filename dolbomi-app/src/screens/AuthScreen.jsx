import { useState } from 'react';
import { Icon } from '../icons';
import { Btn } from '../components/ui';
import { useStore } from '../store';
import { CREATURE_PATHS } from '../components/creature/CreatureHero';

const RANKS = [
  { ko: '이병', en: 'PVT' }, { ko: '일병', en: 'PFC' },
  { ko: '상병', en: 'CPL' }, { ko: '병장', en: 'SGT' },
];
const BRANCHES = ['육군', '해군', '공군', '해병대'];

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 12, border: 'none',
  background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--ink)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

function Chips({ value, options, onChange, labelOf = (o) => o, valueOf = (o) => o }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map((o) => {
        const v = valueOf(o); const on = value === v;
        return (
          <button key={v} type="button" onClick={() => onChange(v)} className="tm-tap" style={{ flex: '1 0 auto', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '9px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--on-accent)' : 'var(--sub)',
            boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{labelOf(o)}</button>
        );
      })}
    </div>
  );
}

export function AuthScreen() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);
  const authError = useStore((s) => s.authError);
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rank, setRank] = useState('이병');
  const [branch, setBranch] = useState('육군');
  const [path, setPath] = useState('haechi');

  const isSignup = mode === 'signup';
  const ready = email.trim() && password.length >= 6 && (!isSignup || name.trim());

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    if (isSignup) {
      const rankEn = (RANKS.find((r) => r.ko === rank) || {}).en || 'PVT';
      await signUp({ email: email.trim(), password, name: name.trim(), rank, rankEn, branch, path });
    } else {
      await signIn(email.trim(), password);
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 24px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--accent-rgb),.14)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.34)', marginBottom: 14 }}>
            {Icon('sparkle', { size: 28, color: 'var(--accent)', stroke: 1.9 })}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>DOLBOMI</div>
          <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 5 }}>
            {isSignup ? '복무를 성장으로. 계정을 만들어 시작하자.' : '다시 왔구나. 이어서 하자.'}
          </div>
        </div>

        <Field label="이메일">
          <input style={inputStyle} type="email" autoComplete="email" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="비밀번호 (6자 이상)">
          <input style={inputStyle} type="password" autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>

        {isSignup && (
          <>
            <Field label="이름 / 콜사인">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="김도현" />
            </Field>
            <Field label="계급">
              <Chips value={rank} options={RANKS} onChange={setRank} labelOf={(r) => r.ko} valueOf={(r) => r.ko} />
            </Field>
            <Field label="군별">
              <Chips value={branch} options={BRANCHES} onChange={setBranch} />
            </Field>
            <Field label="수호신 / 길">
              <Chips value={path} options={CREATURE_PATHS} onChange={setPath} labelOf={(p) => p.ko} valueOf={(p) => p.key} />
            </Field>
          </>
        )}

        {authError && (
          <div style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(var(--accent-rgb),.1)', borderRadius: 10,
            padding: '10px 12px', marginBottom: 12, lineHeight: 1.4, boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.26)' }}>{authError}</div>
        )}

        <div style={{ marginTop: 6 }}>
          <Btn onClick={submit} style={{ opacity: ready && !busy ? 1 : 0.45 }}>
            {busy ? '잠시만…' : isSignup ? '시작하기' : '로그인'}
          </Btn>
        </div>

        <button onClick={() => setMode(isSignup ? 'signin' : 'signup')} className="tm-tap"
          style={{ marginTop: 18, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12.5, color: 'var(--sub)', textAlign: 'center' }}>
          {isSignup ? '이미 계정이 있어 · 로그인' : '처음이야? · 계정 만들기'}
        </button>
      </div>
    </div>
  );
}
