import { Icon } from '../icons';
import { Card, SectionHeader } from '../components/ui';
import { useStore } from '../store';
import { GuardianHero, evolutionOf } from '../components/creature/GuardianCard';
import { StatRow } from '../components/SkillDetail';
import { BadgeCard } from '../components/Badges';
import { ActivityLog } from '../components/ActivityLog';

export function ProfileScreen({ soldier, stats, statMode, onOpen, creaturePath, creatureAnimal, milestones, pulseSignal, onPickPath, onOpenOpp, onOpenAvatar, onOpenSettings }) {
  const titles = useStore((s) => s.titles);
  const equipTitle = useStore((s) => s.equipTitle);
  const owned = titles.filter((t) => t.owned).length;
  const evo = evolutionOf(stats);

  return (
    <div className="tm-rise">
      <div style={{ marginBottom: 18 }}>
        <GuardianHero soldier={soldier} stats={stats} creaturePath={creaturePath} creatureAnimal={creatureAnimal}
          milestones={milestones} pulseSignal={pulseSignal} onPickPath={onPickPath} variant="profile" onOpenAvatar={onOpenAvatar} />
      </div>

      <SectionHeader right={`총 ${evo.total} XP`} caption="여섯 능력치의 경험치 합이 수호신의 진화 단계를 결정한다">능력치 · 경험치</SectionHeader>
      <Card pad={18} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 6 }}>
          <Radar stats={stats} mode={statMode} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--sub)', fontWeight: 600 }}>여섯 능력치 합산</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
              <span className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--accent)' }}>{evo.total}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--faint)' }}>XP</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4 }}>
              {evo.maxed ? '최종 진화 도달' : <>다음 진화 <b style={{ color: 'var(--ink)' }}>{evo.nextLabel}</b>까지 {100 - evo.pct}% 남음</>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          {stats.map((s) => <StatRow key={s.key} s={s} mode={statMode} divided={true} onOpenOpp={onOpenOpp} />)}
        </div>
      </Card>

      <SectionHeader right={`${owned} / ${titles.length}`} caption="보유한 칭호를 탭하면 착용 · 임무와 기록이 새겨진 문장">칭호</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {titles.map((t) => <BadgeCard key={t.name} t={t} onEquip={() => equipTitle(t.name)} />)}
      </div>

      <SectionHeader caption="이번 달 결산과 최근 활동 기록">기록</SectionHeader>
      <ActivityLog onOpenRecap={() => onOpen('wrapped')} />

      <button onClick={onOpenSettings} className="tm-tap" style={{ width: '100%', marginTop: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 15px', borderRadius: 'var(--r-md)',
        background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--sub)', fontSize: 13.5, fontWeight: 700 }}>
        {Icon('sliders', { size: 17, color: 'var(--sub)', stroke: 2 })}
        <span style={{ flex: 1, textAlign: 'left' }}>설정 · 테마 · 수호신 · 계정</span>
        {Icon('chevR', { size: 16, color: 'var(--faint)' })}
      </button>
    </div>
  );
}

function Radar({ stats, mode, size = 132 }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 10;
  const n = stats.length;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, R * v / 100).join(',')).join(' ');
  const cur = stats.map((s) => s.cur);
  const tgt = stats.map((s) => s.tgt);
  const accent = mode === 'color' ? '#9B8CF5' : 'var(--accent)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {[0.33, 0.66, 1].map((g, i) => (
        <polygon key={i} points={stats.map((_, idx) => pt(idx, R * g).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {stats.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hair)" strokeWidth="1" />; })}
      <polygon points={poly(tgt)} fill="var(--track)" stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 3" />
      <polygon points={poly(cur)} fill="rgba(var(--accent-rgb),.16)" stroke={accent} strokeWidth="1.8" />
      {cur.map((v, i) => { const [x, y] = pt(i, R * v / 100); return <circle key={i} cx={x} cy={y} r="2.4" fill={accent} />; })}
    </svg>
  );
}
