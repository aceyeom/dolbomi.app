// DOLBOMI unified data module.
//
// This is the SINGLE SOURCE OF TRUTH for *reference* content (the opportunity
// catalog, benefits, titles, the quest pool) and the static UI config (moods,
// categories, filters). The Supabase reference tables are generated from this
// file by `scripts/gen-supabase-seed.mjs`, and it is also the offline fallback
// the store uses when no Supabase session is available.
//
// Per-user *mutable* state (a soldier's stats, tonight's quests, completion,
// streak, titles, activity) lives in Supabase, NOT here.

// ── Date helpers — D-day advances with real time ──────────────────────
const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export function daysUntil(iso, from = new Date()) {
  return Math.max(0, Math.round((startOfDay(iso) - startOfDay(from)) / DAY));
}
export function ddayLabel(iso, from = new Date()) {
  const n = daysUntil(iso, from);
  return n === 0 ? 'D-day' : `D-${n}`;
}

// ── Soldier profile (demo persona / offline fallback) ─────────────────
// Real users get their own profile from Supabase. `dday`/`served` are derived
// live from the discharge/enlist dates so they are never frozen (LOGIC-GAPS I2).
const ENLIST_DATE = '2025-06-10';
const DISCHARGE_DATE = '2027-03-28';
export function servedBetween(enlist = ENLIST_DATE, discharge = DISCHARGE_DATE, from = new Date()) {
  const a = startOfDay(enlist), b = startOfDay(discharge), now = startOfDay(from);
  const total = b - a;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - a) / total));
}
const servedFraction = servedBetween;

export const soldier = {
  name: '김도현',
  rank: '상병',
  rankEn: 'CPL',
  title: '불굴',
  unit: '제3보병사단',
  branch: '육군',
  enlistDate: ENLIST_DATE,
  dischargeDate: DISCHARGE_DATE,
  get dday() { return daysUntil(DISCHARGE_DATE); },
  get served() { return servedFraction(); },
  streak: 14,
};

// ── 6 stats ───────────────────────────────────────────────────────────
// `base` is the starting value a brand-new account gets (used by the Supabase
// new-user trigger); `cur` is the demo persona's value for the offline fallback.
export const stats = [
  { key: 'body',   mil: '전투력', en: 'BODY',   real: '체력·건강',   cur: 62, tgt: 80, base: 20 },
  { key: 'mind',   mil: '정신력', en: 'MIND',   real: '멘탈·집중',   cur: 55, tgt: 75, base: 18 },
  { key: 'money',  mil: '자산력', en: 'MONEY',  real: '자산·금융',   cur: 48, tgt: 70, base: 12 },
  { key: 'craft',  mil: '숙련도', en: 'CRAFT',  real: '기술·자격',   cur: 71, tgt: 90, base: 22 },
  { key: 'people', mil: '지휘력', en: 'PEOPLE', real: '리더십·소통', cur: 40, tgt: 65, base: 14 },
  { key: 'edge',   mil: '담력',   en: 'EDGE',   real: '용기·도전',   cur: 28, tgt: 60, base: 8 },
];
export const STAT_CAP = 100; // a stat's `cur` is clamped to this; six caps = 600 = top band

export function won(n) {
  return '₩' + n.toLocaleString('en-US');
}

// ── Tonight's quests (starter set for a fresh account / offline) ───────
export const tonight = [
  { id: 'q1', stat: 'body',  txt: '팔굽혀펴기 50개',          min: 5,  xp: 3, done: false },
  { id: 'q2', stat: 'mind',  txt: '책 10페이지 읽기',          min: 10, xp: 2, done: false },
  { id: 'q3', stat: 'edge',  txt: '선임에게 자격증 추천받기',  min: 3,  xp: 4, done: false, hard: true },
];

// ── Quest pool — the check-in regenerates "오늘 밤의 3" from this by energy ──
// (LOGIC-GAPS B1/B3). Mirrored into the Supabase `quest_pool` table.
export const questPool = [
  { stat: 'body',   txt: '팔굽혀펴기 50개',           min: 5,  xp: 3, hard: false },
  { stat: 'body',   txt: '플랭크 2분',                 min: 3,  xp: 2, hard: false },
  { stat: 'body',   txt: '3km 러닝',                   min: 20, xp: 5, hard: true },
  { stat: 'mind',   txt: '책 10페이지 읽기',           min: 10, xp: 2, hard: false },
  { stat: 'mind',   txt: '기출 한 문제 풀기',          min: 5,  xp: 2, hard: false },
  { stat: 'mind',   txt: '오답 노트 30분 정리',        min: 30, xp: 5, hard: true },
  { stat: 'craft',  txt: '강의 한 챕터 듣기',          min: 15, xp: 3, hard: false },
  { stat: 'craft',  txt: '코드 한 줄 커밋하기',        min: 10, xp: 3, hard: false },
  { stat: 'money',  txt: '이번 달 납입 확인',          min: 2,  xp: 2, hard: false },
  { stat: 'money',  txt: '지출 내역 5분 점검',         min: 5,  xp: 2, hard: false },
  { stat: 'people', txt: '선임/후임에게 안부 묻기',    min: 3,  xp: 2, hard: false },
  { stat: 'people', txt: '분대 브리핑 자원하기',       min: 10, xp: 4, hard: true },
  { stat: 'edge',   txt: '선임에게 자격증 추천받기',   min: 3,  xp: 4, hard: true },
  { stat: 'edge',   txt: '새로운 기회 한 개 살펴보기', min: 5,  xp: 2, hard: false },
];

// ── Mood / energy ─────────────────────────────────────────────────────
export const moods = [
  { key: 'low',  emoji: '😮‍💨', label: '지친다' },
  { key: 'meh',  emoji: '😐',   label: '그저그럼' },
  { key: 'ok',   emoji: '🙂',   label: '괜찮아' },
  { key: 'good', emoji: '😤',   label: '의욕충전' },
];
export const energy = ['바닥', '낮음', '보통', '높음'];

// ── Catalog categories ────────────────────────────────────────────────
export const cats = {
  금융:   { c: 'var(--positive)', icon: 'wallet' },
  자격증: { c: '#6FB4E0', icon: 'craft' },
  어학:   { c: '#6FB4E0', icon: 'graduation' },
  학점:   { c: '#9B8CF5', icon: 'book' },
  교육:   { c: '#9B8CF5', icon: 'graduation' },
  대회:   { c: 'var(--accent)', icon: 'flag' },
  체력:   { c: '#FF9F4A', icon: 'body' },
};
// Radar filter chips — every category that actually exists in the catalog
// (LOGIC-GAPS I1: 교육 used to be missing).
export const radarCats = ['전체', '대회', '자격증', '어학', '금융', '교육', '체력'];

// ── XP helpers ────────────────────────────────────────────────────────
const XP = { S: 15, M: 38, L: 90 };
const sq = (id, text, size, stat, done, service) => ({
  id, text, size, xp: XP[size], stat, done: !!done, service: service || null,
});

function fillOf(ms) {
  const all = ms.flatMap((m) => m.subquests);
  const tot = all.reduce((a, s) => a + s.xp, 0) || 1;
  const got = all.filter((s) => s.done).reduce((a, s) => a + s.xp, 0);
  return Math.round((got / tot) * 100);
}

const OPP_IMG = {
  startup: '1542744173-8e7e53415bb0', jeongcheo: '1498050108023-c5249f4df085',
  toeic: '1513258496099-48168024aec0', hanguksa: '1481627834876-b7833e8f5570',
  jeokgeum: '1551288049-bebda4e38f71', cheryeok: '1552674605-db6ffd4facb5',
  swai: '1461749280684-dccba630e2f6', cheongnyeon: '1460925895917-afdab827c52f',
  naeil: '1522071820081-009f0129c71c', defai: '1555066931-4365d14bab8c',
};

// ── Opportunity Catalog ───────────────────────────────────────────────
// Each opp carries an absolute `deadline` so D-day decrements with real time.
// `unlockDday` (90) marks opportunities that only open once the soldier is
// within that many days of discharge (LOGIC-GAPS I3 gating).
const _catalog = [
  {
    id: 'startup', cat: '대회', stat: 'edge', title: '육군창업경진대회', hot: true,
    sub: 'K-스타트업 전국 본선 연계 · 2~5인 팀', deadline: '2026-07-25',
    what: '육군이 여는 창업 경진대회. 본선 수상하면 포상휴가에 상금, 창업멘토링캠프까지.',
    eligibility: '육군 (장교·부사관·병) · 2~5인 팀 (단독 불가)',
    applyWhere: 'army-startup.co.kr', source: '육군본부 · army-startup.co.kr', verified: '2026.05',
    cost: '무료', started: true,
    reward: { kind: '휴가', finish: '+2~5일', maxDays: 5, label: '본선 수상 포상휴가 2~5일 + 상금', note: '부대 내규 · 본선 수상자 기준' },
    why: '입상 = 포상휴가. 네 아이디어로 휴가 따자.',
    expectedPct: 38, status: 'tight',
    milestones: [
      { id: 'm1', title: '아이디어 확정', date: '~D-40', subquests: [
        sq('s1', '아이디어 한 줄로 정리', 'S', 'edge', true),
        sq('s2', '비슷한 서비스 3개 시장조사', 'M', 'edge', true),
      ] },
      { id: 'm2', title: '팀 + 사업모델', date: '~D-25', subquests: [
        sq('s3', '팀원 1~4명 모으기', 'M', 'people', false),
        sq('s4', '사업모델 한 장(BMC) 작성', 'L', 'edge', false),
      ] },
      { id: 'm3', title: '제출', date: '~D-10', subquests: [
        sq('s5', '5분 발표영상 촬영', 'L', 'edge', false),
        sq('s6', '유튜브 업로드 + 예선 접수', 'M', 'edge', false, { name: 'army-startup.co.kr', kind: '접수', gov: true }),
        sq('s7', '본선 Q&A 리허설', 'M', 'people', false),
      ] },
    ],
  },
  {
    id: 'jeongcheo', cat: '자격증', stat: 'craft', title: '정보처리산업기사', hot: true,
    sub: '국방부 위탁 무료검정 · 응시료 0원', deadline: '2026-06-22',
    what: '군이 직접 여는 무료 국가기술자격 검정. 필기·실기 모두 부대 안에서.',
    eligibility: '육·해·공·해병·국직·카투사·상근 현역',
    applyWhere: '국방부 위탁검정 · Q-Net', source: 'korea.kr · 위탁검정 안내', verified: '2026.04',
    cost: '무료 (위탁검정)', started: true,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 보통 2~5일', note: '포상휴가는 부대 내규' },
    why: '응시료 0원, 자격증은 평생 간다. 필기 임박.',
    expectedPct: 60, status: 'tight',
    milestones: [
      { id: 'm1', title: '필기', date: 'D-12', subquests: [
        sq('s1', '종목·시험일 D-day 등록', 'S', 'craft', true),
        sq('s2', '소프트웨어설계 기출 1회분', 'M', 'craft', true),
        sq('s3', '데이터베이스 기출 1회분', 'M', 'craft', true),
        sq('s4', '프로그래밍언어 기출 1회분', 'M', 'craft', false),
        sq('s5', '필기 응시', 'L', 'craft', false),
      ] },
      { id: 'm2', title: '실기', date: 'D-48', subquests: [
        sq('s6', '실기 환경 세팅', 'M', 'craft', false),
        sq('s7', '실기 기출 2회분', 'L', 'craft', false),
        sq('s8', '실기 응시', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '마무리', date: 'D-55', subquests: [
        sq('s9', '합격 확인 + 포상휴가 신청', 'S', 'craft', false),
      ] },
    ],
  },
  {
    id: 'toeic', cat: '어학', stat: 'craft', title: 'TOEIC 900', hot: false,
    sub: '취업 필수 스펙 · 응시료 자기개발비', deadline: '2026-07-15',
    what: '이력서의 기본기. 매일 30분이면 전역 전에 충분히 만든다.',
    eligibility: '전 군 공통',
    applyWhere: 'TOEIC 접수 · 학습 앱 제휴', source: 'ETS · 자기개발비 안내', verified: '2026.03',
    cost: '응시료 자기개발비 대상', started: true,
    reward: { kind: '휴가', finish: '+4~5일', maxDays: 5, label: '포상휴가 4~5일(부대 내규) + 취업 스펙', note: '어학 포상휴가는 부대별 상이' },
    why: '하루 30분이면 900 가능. 페이스 좋아.',
    expectedPct: 42, status: 'on',
    milestones: [
      { id: 'm1', title: '진단 + 루틴', date: '~D-30', subquests: [
        sq('s1', '모의고사로 현재 점수 진단', 'M', 'craft', true),
        sq('s2', 'LC Part 2 30분', 'M', 'craft', true, { name: '산타토익', kind: '학습', gov: false }),
        sq('s3', 'RC Part 5 문법 30분', 'M', 'craft', false, { name: '산타토익', kind: '학습', gov: false }),
      ] },
      { id: 'm2', title: '실전', date: '~D-10', subquests: [
        sq('s4', '실전 모의고사 1회', 'L', 'craft', false),
        sq('s5', '오답 노트 정리', 'M', 'craft', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-35', subquests: [
        sq('s6', '응시 접수 (자기개발비)', 'S', 'craft', false, { name: '나라사랑포털', kind: '환급', gov: true }),
      ] },
    ],
  },
  {
    id: 'hanguksa', cat: '자격증', stat: 'mind', title: '한국사능력검정 1급', hot: false,
    sub: '공무원·공기업 가산점 · 문과 친화', deadline: '2026-06-30',
    what: '공무원·공기업 채용 가산점에 바로 쓰이는 국가 시험.',
    eligibility: '전 군 공통',
    applyWhere: '국사편찬위원회', source: 'historyexam.go.kr', verified: '2026.04',
    cost: '응시료 자기개발비 대상', started: true,
    reward: { kind: '휴가', finish: '+2박3일', maxDays: 3, label: '포상휴가 흔히 2박3일 + 채용 가산점', note: '부대 내규' },
    why: '기출이 밀렸다. 페이스 끌어올려야 함.',
    expectedPct: 55, status: 'risk',
    milestones: [
      { id: 'm1', title: '개념', date: '~D-14', subquests: [
        sq('s1', '기본서 전근대 1회독', 'L', 'mind', true),
        sq('s2', '기본서 근현대 1회독', 'L', 'mind', false),
      ] },
      { id: 'm2', title: '기출', date: '~D-5', subquests: [
        sq('s3', '기출 1회분', 'M', 'mind', false),
        sq('s4', '기출 2회분', 'M', 'mind', false),
        sq('s5', '기출 3회분', 'M', 'mind', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-20', subquests: [
        sq('s6', '시험 접수', 'S', 'mind', false),
      ] },
    ],
  },
  {
    id: 'jeokgeum', cat: '금융', stat: 'money', title: '장병내일준비적금', hot: false,
    sub: '정부가 원금 100% 매칭 · 전역일 ~2,000만', deadline: '2027-03-28',
    what: '정부가 납입 원금을 100% 얹어주는 군인 전용 적금. 비과세에 기본 이자까지.',
    eligibility: '현역병·상근·사회복무 등 (1인, 최대 2계좌)',
    applyWhere: '은행 앱 (KB·IBK·NH 등) + 나라사랑카드', source: 'mnd.go.kr · 병무청', verified: '2026.05',
    cost: '무료', started: true,
    reward: { kind: 'money', finish: '~2,000만', label: '전역일 예상 ~2,000만 (정부 매칭 포함)', note: '만기(전역일)까지 유지 시' },
    why: '매달 납입만 유지하면 됨. 정부 돈 990만이 공짜로 따라온다.',
    expectedPct: 70, status: 'on',
    milestones: [
      { id: 'm1', title: '개설', date: '완료', subquests: [
        sq('s1', '나라사랑카드 확인', 'S', 'money', true),
        sq('s2', '적금 계좌 개설', 'M', 'money', true, { name: 'KB스타뱅킹', kind: '개설', gov: false }),
        sq('s3', '납입한도 55만 상향', 'S', 'money', true),
      ] },
      { id: 'm2', title: '유지', date: '매달', subquests: [
        sq('s4', '이번 달 납입 확인', 'S', 'money', false),
      ] },
      { id: 'm3', title: '만기', date: '전역일', subquests: [
        sq('s5', '만기일(전역일) 추적', 'S', 'money', false),
      ] },
    ],
  },
  {
    id: 'cheryeok', cat: '체력', stat: 'body', title: '여단 체력왕 선발', hot: false,
    sub: '3km 러닝 + 윗몸 + 팔굽 · 측정 임박', deadline: '2026-06-19',
    what: '체력검정 특급은 여러 부대에서 포상휴가로 직결된다.',
    eligibility: '소속 부대 체력검정 대상',
    applyWhere: '부대 체력검정', source: '군인 휴가규정 · 부대 내규', verified: '2026.05',
    cost: '무료', started: true,
    reward: { kind: '휴가', finish: '+3일', maxDays: 3, label: '포상휴가 3일 (부대 내규)', note: '부대별 상이' },
    why: '전투력 이미 좋다. 충분히 노린다.',
    expectedPct: 55, status: 'on',
    milestones: [
      { id: 'm1', title: '측정', date: 'D-9', subquests: [
        sq('s1', '3km 현재 기록 측정', 'M', 'body', true),
        sq('s2', '윗몸 2분 테스트', 'S', 'body', true),
      ] },
      { id: 'm2', title: '훈련', date: '~D-2', subquests: [
        sq('s3', '인터벌 러닝 (주 4회)', 'M', 'body', false),
        sq('s4', '팔굽혀펴기 루틴', 'S', 'body', false),
      ] },
      { id: 'm3', title: '검정', date: 'D-day', subquests: [
        sq('s5', '체력검정 응시', 'M', 'body', false),
      ] },
    ],
  },
  {
    id: 'swai', cat: '자격증', stat: 'craft', title: '장병 SW·AI 역량강화', hot: true,
    sub: '구름(goorm) × 국방부 · 온라인 무료', deadline: '2026-07-08',
    what: '국방부와 구름이 함께 여는 장병 대상 SW·AI 무료 교육.',
    eligibility: '현역 장병 (온라인 수강)',
    applyWhere: 'edu.goorm.io · 국방부 공지', source: '국방부 · goorm', verified: '2026.05',
    cost: '무료', started: true,
    reward: { kind: 'cert', finish: '수료증', label: 'SW·AI 수료증 + 포트폴리오', note: '취업 연계' },
    why: '시간 날 때 듣기만 해도 포트폴리오. IT 취업의 첫 줄.',
    expectedPct: 30, status: 'on',
    milestones: [
      { id: 'm1', title: '입문', date: '~D-22', subquests: [
        sq('s1', '계정 만들고 과정 등록', 'S', 'craft', true, { name: 'goorm EDU', kind: '등록', gov: false }),
        sq('s2', '1주차 강의 수강', 'M', 'craft', true),
        sq('s3', '2주차 강의 + 실습', 'M', 'craft', false),
      ] },
      { id: 'm2', title: '프로젝트', date: '~D-8', subquests: [
        sq('s4', '미니 프로젝트 제출', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '수료', date: 'D-28', subquests: [
        sq('s5', '수료 인증 + 포트폴리오 정리', 'S', 'craft', false),
      ] },
    ],
  },
  {
    id: 'cheongnyeon', cat: '금융', stat: 'money', title: '청년미래적금', hot: true,
    sub: '2026.06 신설 · 청년 자산형성 매칭', deadline: '2026-09-08', unlockDday: 90,
    what: '2026년 6월 출시된 청년 자산형성 적금. 전역 직후(D-90 구간) 가입 자격을 확인한다.',
    eligibility: '자격·소득 요건 충족 청년 (전역 후 확인)',
    applyWhere: '서민금융진흥원 · 은행 앱', source: '금융위 · 2026.06 시행', verified: '2026.06',
    cost: '무료', started: false,
    reward: { kind: 'money', finish: '+매칭', label: '정부 매칭 6%/12% (요건별)', note: '소득·자격 요건 확인 필수' },
    why: '전역하면 바로 자격 확인. 장병적금 → 청년미래적금으로 끊김 없이.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '자격 확인', date: 'D-90 해금', subquests: [
        sq('s1', '소득·연령 요건 셀프 체크', 'S', 'money', false),
        sq('s2', '필요 서류 확인', 'S', 'money', false),
      ] },
      { id: 'm2', title: '가입', date: '전역 후', subquests: [
        sq('s3', '은행 앱에서 가입', 'M', 'money', false, { name: '서민금융진흥원', kind: '가입', gov: true }),
      ] },
    ],
  },
  {
    id: 'naeil', cat: '교육', stat: 'edge', title: '국민내일배움카드', hot: false,
    sub: '훈련비 국비 지원 · 전역 후 즉시', deadline: '2026-09-08', unlockDday: 90,
    what: '직업훈련비를 국가가 대주는 카드. 전역 직후(D-90 구간) 발급받아 코딩·디자인 부트캠프를 국비로 듣는다.',
    eligibility: '구직자·재직자 등 (전역 후 발급)',
    applyWhere: 'HRD-Net · 고용센터', source: '고용노동부 · HRD-Net', verified: '2026.05',
    cost: '발급 무료 (훈련비 국비)', started: false,
    reward: { kind: 'cert', finish: '국비 훈련', label: '최대 수백만원 훈련비 지원', note: '훈련 과정·요건별 상이' },
    why: '전역 = 끝이 아니라 시작. 내일배움카드로 바로 부트캠프.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '발급', date: 'D-90 해금', subquests: [
        sq('s1', 'HRD-Net 가입 + 동영상 교육', 'M', 'edge', false, { name: 'HRD-Net', kind: '발급', gov: true }),
        sq('s2', '카드 신청', 'S', 'edge', false),
      ] },
      { id: 'm2', title: '훈련 선택', date: '전역 후', subquests: [
        sq('s3', '관심 과정 3개 비교', 'M', 'craft', false),
        sq('s4', '수강 신청', 'M', 'edge', false),
      ] },
    ],
  },
  {
    id: 'defai', cat: '대회', stat: 'edge', title: '국방 AI 아이디어 경연', hot: false,
    sub: '전군 대상 · AI 활용 아이디어', deadline: '2026-08-01',
    what: '국방 분야 AI 활용 아이디어를 겨루는 경연. 수상하면 포상휴가에 더해 군 SW·AI 교육과 이어진다.',
    eligibility: '전 군 공통 (개인·팀)',
    applyWhere: '국방부 공지 · 접수처', source: '국방부', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~4일', maxDays: 4, label: '수상 포상휴가 2~4일 (부대 내규)', note: '부대 내규' },
    why: 'SW·AI 교육에서 배운 걸 바로 아이디어로. 입상하면 휴가.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '아이디어', date: '~D-40', subquests: [
        sq('s1', '국방 문제 1개 정하기', 'S', 'edge', false),
        sq('s2', 'AI 적용 방식 스케치', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '제출', date: 'D-52', subquests: [
        sq('s3', '제안서 한 장 작성', 'L', 'edge', false),
        sq('s4', '접수', 'S', 'edge', false),
      ] },
    ],
  },
];

// Finalize derived fields (fill%, live dday, img)
_catalog.forEach((o) => {
  o.fill = fillOf(o.milestones);
  o.dday = daysUntil(o.deadline);
  o.img = `https://images.unsplash.com/photo-${OPP_IMG[o.id] || OPP_IMG.startup}?w=720&h=420&fit=crop&q=72`;
});

export const catalog = _catalog;
export const oppById = (id) => catalog.find((o) => o.id === id);

// ── Vacation Ladder (offline fallback) ────────────────────────────────
// `secured` now reflects only fully-completed vacation opportunities — no
// constant fallback (LOGIC-GAPS H1). maxDays comes from each opp's reward, the
// single source of truth (LOGIC-GAPS H2).
function securedDays(cat = catalog) {
  return cat
    .filter((o) => o.reward.kind === '휴가')
    .reduce((n, o) => {
      const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
      return n + (allDone ? (o.reward.maxDays || 0) : 0);
    }, 0);
}
export const vacation = {
  secured: securedDays(),
  ladder: catalog.filter((o) => o.reward.kind === '휴가').map((o) => ({
    id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note,
  })),
};

// ── Benefits Hub ──────────────────────────────────────────────────────
// `branches` drives the branch filter (LOGIC-GAPS F6). '전군' matches every branch.
export const benefits = [
  { id: 'b1', title: '장병내일준비적금', icon: 'wallet', tone: 'positive', value: '원금 100% 정부 매칭 → 전역일 ~2,000만',
    where: '은행 앱 + 나라사랑카드', branches: ['전군'], oppId: 'jeokgeum', headline: true },
  { id: 'b2', title: '자기개발비', icon: 'coins', tone: 'positive', value: '응시료·도서·강좌 80% 환급 · 연 최대 12만',
    where: '나라사랑포털 → 자기개발', branches: ['전군'], oppId: 'toeic' },
  { id: 'b3', title: '국가기술자격 무료검정', icon: 'craft', tone: 'accent', value: '~82개 종목 무료 응시 (위탁검정)',
    where: '국방부 위탁검정', branches: ['전군'], oppId: 'jeongcheo' },
  { id: 'b4', title: '대학 원격강좌 학점', icon: 'graduation', tone: 'accent', value: '학기당 6 / 연 12학점, 등록금 80% 환급',
    where: '나라사랑포털 → 군 e-러닝', branches: ['전군'] },
  { id: 'b5', title: '군 e-러닝 강좌', icon: 'book', tone: 'accent', value: '8,000+ 무료/할인 (어학·IT·자격증) + 전화영어',
    where: '나라사랑포털', branches: ['전군'] },
  { id: 'b6', title: '어학 응시료 할인', icon: 'graduation', tone: 'neutral', value: 'TOEIC 등 제휴 할인',
    where: '나라사랑포털 제휴', branches: ['전군'], oppId: 'toeic' },
  { id: 'b7', title: '나라사랑카드 혜택', icon: 'wallet', tone: 'neutral', value: '제휴 할인·포인트 적립',
    where: '카드 혜택', branches: ['전군'] },
  { id: 'b8', title: '해군 함정근무 가산점', icon: 'shield', tone: 'neutral', value: '함정 근무일 비례 자기개발 가산',
    where: '해군 인사근무', branches: ['해군'] },
  { id: 'b9', title: '공군 어학특기 우대', icon: 'graduation', tone: 'neutral', value: '어학 성적 보직·교육 우대',
    where: '공군 인사', branches: ['공군'] },
  { id: 'b10', title: '해병대 특수전 수당', icon: 'medal', tone: 'neutral', value: '특수 임무 수당·포상휴가 연계',
    where: '해병대 인사', branches: ['해병대'] },
  { id: 'b11', title: '제대군인·청년 지원', icon: 'briefcase', tone: 'neutral', value: '취업·정책 연계 (전역 후)',
    where: '셀프 필터 → 포털', branches: ['전군'] },
];

// ── Titles (칭호) ─────────────────────────────────────────────────────
// `req` drives automatic awarding (LOGIC-GAPS J1). Mirrored into Supabase
// `titles` and evaluated by the award_titles() SQL routine.
//   { kind:'stat', stat, val } | { kind:'streak', val } | { kind:'manual' }
export const titles = [
  { name: '불굴', desc: '14일 연속 출석', rarity: '보유', req: { kind: 'streak', val: 14 } },
  { name: '철벽', desc: '전투력 60 돌파', rarity: '보유', req: { kind: 'stat', stat: 'body', val: 60 } },
  { name: '숙련의 증표', desc: '숙련도 70 돌파', rarity: '보유', req: { kind: 'stat', stat: 'craft', val: 70 } },
  { name: '새벽의 독서가', desc: '정신력 60 돌파', rarity: '보유', req: { kind: 'stat', stat: 'mind', val: 60 } },
  { name: '분대의 기둥', desc: '지휘력 55 돌파', rarity: '잠김', req: { kind: 'stat', stat: 'people', val: 55 } },
  { name: '심연의 담력', desc: '담력 60 돌파 (최고 난도)', rarity: '잠김', legendary: true, req: { kind: 'stat', stat: 'edge', val: 60 } },
];

// Title ownership for the OFFLINE persona (online users earn these by logic).
const OFFLINE_OWNED = { '불굴': true, '철벽': true, '숙련의 증표': true };
export const offlineTitles = titles.map((t) => ({
  name: t.name, desc: t.desc, rarity: t.rarity, legendary: !!t.legendary,
  owned: !!OFFLINE_OWNED[t.name], equipped: t.name === soldier.title,
}));

// ── Monthly Wrapped (recap copy; the live values are derived from activity) ──
export const wrapped = {
  month: '5월', topStat: { mil: '전투력', gain: 3 },
  newTitle: '불굴', line: '이번 달, 너는 멈추지 않았다.',
  weekly: [6, 9, 11, 16],
  gains: [
    { key: 'body', val: 3 }, { key: 'craft', val: 5 }, { key: 'money', val: 4 },
    { key: 'mind', val: 2 }, { key: 'people', val: 1 }, { key: 'edge', val: 2 },
  ],
};

// ── Activity log (offline fallback) ───────────────────────────────────
export const activity = [
  { day: '오늘',  time: '21:04', type: 'quest',  stat: 'craft',  text: '정보처리 필기 기출 1회독', xp: 12 },
  { day: '오늘',  time: '07:10', type: 'checkin', text: '오늘의 컨디션 체크인 · 의욕충전', streak: 14 },
  { day: '어제',  time: '13:48', type: 'quest',  stat: 'body',   text: '체력단련 3km + 팔굽혀펴기', xp: 8 },
  { day: '5.27',  time: '20:15', type: 'title',  text: '칭호 획득 · 불굴', legendary: false },
  { day: '5.27',  time: '19:02', type: 'quest',  stat: 'mind',   text: '독서 30분 · 자기계발서', xp: 6 },
  { day: '5.25',  time: '18:40', type: 'milestone', text: '정보처리기능사 필기 접수 완료', opp: 'jeongcheo' },
  { day: '5.24',  time: '21:55', type: 'quest',  stat: 'edge',   text: '발표 자원 · 분대 브리핑', xp: 10 },
  { day: '5.22',  time: '12:10', type: 'cert',   text: '한국사능력검정 2급 합격', xp: 0 },
];

// ── Benefit filters ───────────────────────────────────────────────────
export const benefitFilters = {
  군별: ['전군', '육군', '해군', '공군', '해병대'],
};
