import { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { ScreenHead } from './components/ui';
import { useStore } from './store';
import { HomeScreen } from './screens/HomeScreen';
import { RadarScreen } from './screens/RadarScreen';
import { VacationScreen } from './screens/VacationScreen';
import { BenefitsScreen } from './screens/BenefitsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OppDetail } from './screens/OppDetail';
import { OppPlan } from './screens/OppPlan';
import { CheckInSheet, QuestComplete, Wrapped } from './components/Overlays';
import { AvatarViewer } from './components/creature/AvatarViewer';
import { CREATURE_PATHS } from './components/creature/CreatureHero';
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect } from './components/TweaksPanel';
import { IOSDevice } from './components/IOSFrame';
import './styles/tokens.css';

const TWEAK_DEFAULTS = {
  palette: '골드',
  theme: '다크',
  creaturePath: '해치',
  creatureAnimal: '숫양',
  istroke: 1.75,
  game: 20,
  statMode: '단색',
  showAi: true,
};

const PAL_MAP = { '골드': 'gold', '택티컬': 'green', '스틸': 'steel' };
const PATH_MAP = { '해치': 'haechi', '청룡': 'dragon', '봉황': 'phoenix', '백호': 'tiger' };
const PATH_KO = { haechi: '해치', dragon: '청룡', phoenix: '봉황', tiger: '백호' };
const ANIMAL_FOR_PATH = { haechi: 'ram', dragon: 'fox', phoenix: 'ram', tiger: 'fox' };

const NAV = [
  { key: 'home', label: '홈', icon: 'home' },
  { key: 'radar', label: '기회', icon: 'target' },
  { key: 'vacation', label: '휴가', icon: 'palm' },
  { key: 'benefits', label: '혜택', icon: 'shieldGift' },
  { key: 'profile', label: '프로필', icon: 'user' },
];
const TAB_TITLES = { home: '', radar: '기회 레이더', vacation: '휴가 사다리', benefits: '혜택', profile: '프로필' };

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('home');
  const [pushed, setPushed] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [mood, setMood] = useState(null);
  const [pulse, setPulse] = useState(0);

  // live data from the API-backed store
  const loaded = useStore((s) => s.loaded);
  const soldier = useStore((s) => s.soldier);
  const allStats = useStore((s) => s.stats);
  const quests = useStore((s) => s.tonight);
  const catalog = useStore((s) => s.catalog);
  const bootstrap = useStore((s) => s.bootstrap);
  const oppById = useStore((s) => s.oppById);
  const storeToggleTonight = useStore((s) => s.toggleTonight);
  const storeToggleSubquest = useStore((s) => s.toggleSubquest);
  const storeCheckin = useStore((s) => s.checkin);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // resolve a pushed opportunity from the live catalog so detail/plan screens
  // reflect saved progress as subquests toggle
  const pushedOpp = pushed && pushed.id ? oppById(pushed.id) : null;
  const getMs = (o) => o.milestones;

  const statMode = t.statMode === '컬러' ? 'color' : 'mono';
  const theme = t.theme === '라이트' ? 'light' : 'dark';
  const creaturePath = PATH_MAP[t.creaturePath] || 'haechi';
  const creatureAnimal = ANIMAL_FOR_PATH[creaturePath] || 'ram';
  const swapToPath = (key) => setTweak('creaturePath', PATH_KO[key] || '해치');

  const milestones = useMemo(() => {
    const cat = (catalog || []).reduce((n, o) =>
      n + o.milestones.filter((m) => m.subquests.every((s) => s.done)).length, 0);
    return cat + quests.filter((q) => q.done).length;
  }, [catalog, quests]);

  const toggleQuest = (id) => {
    const q = quests.find((x) => x.id === id);
    if (q && !q.done) setCelebrate(q);   // celebrate on completion
    storeToggleTonight(id);
  };

  const goTab = (k) => { setPushed(null); setTab(k); };
  const openOpp = (o) => setPushed({ type: 'opp', id: o.id });
  const openPlan = (o) => setPushed({ type: 'oppPlan', id: o.id });
  const makeQuest = (oId) => { if (oppById(oId)) setPushed({ type: 'opp', id: oId }); };

  let screen = null;
  if (tab === 'home') screen = <HomeScreen soldier={soldier} stats={allStats} quests={quests} statMode={statMode} mood={mood} showAi={t.showAi} onToggleQuest={toggleQuest} onOpenCheckin={() => setSheet('checkin')} creaturePath={creaturePath} creatureAnimal={creatureAnimal} theme={theme} pulseSignal={pulse} milestones={milestones} onPickPath={(v) => setTweak('creaturePath', v)} onOpenOpp={makeQuest} onOpenAvatar={() => setShowAvatar(true)} />;
  else if (tab === 'radar') screen = <RadarScreen onOpenOpp={openOpp} />;
  else if (tab === 'vacation') screen = <VacationScreen onOpenOpp={openOpp} />;
  else if (tab === 'benefits') screen = <BenefitsScreen onMakeQuest={makeQuest} />;
  else if (tab === 'profile') screen = <ProfileScreen soldier={soldier} stats={allStats} statMode={statMode} onOpen={(k) => setPushed({ type: k })} creaturePath={creaturePath} creatureAnimal={creatureAnimal} milestones={milestones} pulseSignal={pulse} onPickPath={(v) => setTweak('creaturePath', v)} onOpenOpp={makeQuest} onOpenAvatar={() => setShowAvatar(true)} />;

  let pushContent = null, pushTitle = '';
  if (pushed) {
    if (pushed.type === 'opp' && pushedOpp) {
      pushContent = <OppDetail o={pushedOpp} ms={getMs(pushedOpp)} onOpenPlan={() => openPlan(pushedOpp)} onAddTonight={() => { setPushed(null); setTab('home'); }} />;
      pushTitle = '기회 상세';
    } else if (pushed.type === 'oppPlan' && pushedOpp) {
      pushContent = <OppPlan o={pushedOpp} ms={getMs(pushedOpp)} onToggle={(mid, sid, v) => storeToggleSubquest(pushedOpp.id, sid, v)} onAddTonight={() => { setPushed(null); setTab('home'); }} />;
      pushTitle = '전체 계획';
    } else if (pushed.type === 'wrapped') {
      pushContent = <Wrapped />;
      pushTitle = '월간 결산';
    }
  }

  const tabTitle = TAB_TITLES[tab];

  const isDark = theme === 'dark';

  if (!loaded || !soldier) {
    return (
      <IOSDevice dark={isDark}>
        <div className="tempo" data-pal={PAL_MAP[t.palette] || 'gold'} data-theme={theme}
          style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--sub)' }}>
            {Icon('sparkle', { size: 28, color: 'var(--accent)', stroke: 1.8 })}
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>TEMPO 불러오는 중…</span>
          </div>
        </div>
      </IOSDevice>
    );
  }

  return (
    <IOSDevice dark={isDark}>
    <div className="tempo" data-pal={PAL_MAP[t.palette] || 'gold'} data-theme={theme}
      style={{ '--game': (t.game ?? 20) / 100, '--istroke': t.istroke ?? 1.75, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 240, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(90% 60% at 50% -12%, rgba(var(--accent-rgb), calc(.10 * (var(--game) + .4))), transparent 66%)' }} />

      <main style={{ position: 'relative', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        <div key={tab} style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '56px 20px 0' }}>
          {tabTitle && <ScreenHead title={tabTitle} />}
          {screen}
          <div style={{ height: 104 }} />
        </div>

        {pushed && (
          <div key={pushed.type + (pushed.data ? pushed.data.id : '')} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '56px 20px 0', background: 'var(--bg)', zIndex: 5, animation: 'tmSlideIn .3s cubic-bezier(.2,.8,.2,1)' }}>
            <ScreenHead title={pushTitle} onBack={() => setPushed(null)} />
            {pushContent}
            <div style={{ height: 104 }} />
          </div>
        )}
      </main>

      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '10px 18px 26px',
        background: 'linear-gradient(0deg, var(--bg) 62%, transparent)', boxShadow: 'inset 0 1px 0 var(--line)' }}>
        {NAV.map((n) => {
          const on = tab === n.key && !pushed;
          const c = on ? 'var(--accent)' : 'var(--faint)';
          return (
            <button key={n.key} onClick={() => goTab(n.key)} className="tm-tap" style={{ border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 6px', flex: 1 }}>
              {Icon(n.icon, { size: 23, color: c, stroke: on ? 2.05 : 1.7 })}
              <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 600, color: c }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {sheet === 'checkin' && <CheckInSheet onClose={() => setSheet(null)} onDone={(m) => { setMood(m); storeCheckin(m.key, m.energy); setSheet(null); }} />}
      {celebrate && <QuestComplete quest={celebrate} guardianName={(CREATURE_PATHS || []).find((p) => p.key === creaturePath)?.ko || '수호신'} onClose={() => { setCelebrate(null); setPulse((p) => p + 1); }} />}
      {showAvatar && <AvatarViewer stats={allStats} creaturePath={creaturePath} creatureAnimal={creatureAnimal} onSwapPath={swapToPath} milestones={milestones} theme={theme} soldier={soldier} onClose={() => setShowAvatar(false)} />}

      <TweaksPanel>
        <TweakSection label="테마 · 팔레트" />
        <TweakRadio label="모드" value={t.theme} options={['다크', '라이트']} onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="색" value={t.palette} options={['골드', '택티컬', '스틸']} onChange={(v) => setTweak('palette', v)} />
        <TweakSection label="수호신" />
        <TweakSelect label="수호신 / 길" value={t.creaturePath} options={['해치', '청룡', '봉황', '백호']} onChange={(v) => setTweak('creaturePath', v)} />
        <TweakSection label="아이콘" />
        <TweakRadio label="두께" value={String(t.istroke)} options={['1.5', '1.75', '2.1']} onChange={(v) => setTweak('istroke', Number(v))} />
        <TweakSection label="연출 강도" />
        <TweakSlider label="게임성" value={t.game} min={0} max={100} step={10} unit="%" onChange={(v) => setTweak('game', v)} />
        <TweakSection label="스탯" />
        <TweakRadio label="색" value={t.statMode} options={['단색', '컬러']} onChange={(v) => setTweak('statMode', v)} />
        <TweakToggle label="오늘의 한 줄" value={t.showAi} onChange={(v) => setTweak('showAi', v)} />
      </TweaksPanel>
    </div>
    </IOSDevice>
  );
}
