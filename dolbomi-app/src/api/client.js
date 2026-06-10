// DOLBOMI data + auth layer (Supabase-native).
//
// Auth is Supabase Auth (email/password). Reads merge the per-user mutable
// state from Supabase with the reference catalog from src/data and assemble the
// exact snapshot shapes the screens consume — so store.js and every screen are
// unchanged by the backend swap. Writes go through SECURITY DEFINER RPCs that
// own the game logic (stat growth, streak guard, title awards, regeneration).
import { supabase, hasSupabase } from './supabase';
import * as ref from '../data';

export { hasSupabase };

// ── auth ───────────────────────────────────────────────────────────────
export async function getSession() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp({ email, password, name, rank, rankEn, branch, path, unit, dischargeDate }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, rank, rank_en: rankEn, branch, path, unit, discharge_date: dischargeDate } },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (hasSupabase) await supabase.auth.signOut();
}

// ── date label helpers (Asia/Seoul) ────────────────────────────────────
const seoul = (d, opts) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...opts }).format(d);
function dayLabel(d, now = new Date()) {
  const fmt = (x) => seoul(x, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = fmt(now);
  const yest = fmt(new Date(now.getTime() - 86400000));
  const that = fmt(d);
  if (that === today) return '오늘';
  if (that === yest) return '어제';
  const [, m, day] = that.split('.').map((s) => s.trim());
  return `${Number(m)}.${Number(day)}`;
}
const timeLabel = (d) => seoul(d, { hour: '2-digit', minute: '2-digit', hour12: false });

// ── snapshot assembly (reference defs ⨯ per-user state) ─────────────────
export function assembleSnapshot({ profile, statsRows, tonightRows, subsRows, titlesRows, actRows }) {
  const dischargeDate = profile.discharge_date;
  const soldier = {
    name: profile.name, rank: profile.rank, rankEn: profile.rank_en, title: profile.title,
    unit: profile.unit, branch: profile.branch,
    enlistDate: profile.enlist_date, dischargeDate,
    dday: ref.daysUntil(dischargeDate),
    served: ref.servedBetween(profile.enlist_date, dischargeDate),
    streak: profile.streak || 0,
    lastMood: profile.last_mood || null,
  };

  const stats = (statsRows || []).map((s) => ({
    key: s.key, mil: s.mil, en: s.en, real: s.real, cur: s.cur, tgt: s.tgt,
  }));

  const tonight = (tonightRows || []).map((q) => ({
    id: q.id, stat: q.stat, txt: q.txt, min: q.min, xp: q.xp, hard: !!q.hard, done: !!q.done,
  }));

  // completion overrides, keyed opp/subquest
  const sub = {};
  for (const r of subsRows || []) sub[`${r.opp_id}/${r.subquest_id}`] = r;
  const soldierDday = soldier.dday;

  const catalog = ref.catalog.map((o) => {
    let totXp = 0, doneXp = 0;
    const milestones = o.milestones.map((m) => ({
      ...m,
      subquests: m.subquests.map((s) => {
        const st = sub[`${o.id}/${s.id}`];
        const done = st ? !!st.done : false;
        const verified = st ? !!st.verified : false;
        totXp += s.xp; if (done) doneXp += s.xp;
        return { ...s, done, verified };
      }),
    }));
    const fill = Math.round((doneXp / (totXp || 1)) * 100);
    const locked = o.unlockDday != null && soldierDday > o.unlockDday;
    return { ...o, fill, milestones, locked };
  });

  const benefits = ref.benefits;

  const owned = {};
  for (const r of titlesRows || []) owned[r.title_name] = r;
  const titles = ref.titles.map((t) => {
    const o = owned[t.name];
    return {
      name: t.name, desc: t.desc, rarity: t.rarity, legendary: !!t.legendary,
      owned: o ? !!o.owned : false,
      equipped: t.name === profile.title,
    };
  });

  const vacOpps = catalog.filter((o) => o.reward.kind === '휴가');
  const secured = vacOpps.reduce((nDays, o) => {
    const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
    return nDays + (allDone ? (o.reward.maxDays || 0) : 0);
  }, 0);
  const vacation = {
    secured,
    ladder: vacOpps.map((o) => ({ id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note })),
  };

  const now = new Date();
  const activity = (actRows || []).map((a) => {
    const d = new Date(a.created_at);
    const row = { day: dayLabel(d, now), time: timeLabel(d), type: a.type, text: a.text };
    if (a.stat) row.stat = a.stat;
    if (a.xp != null) row.xp = a.xp;
    if (a.amount != null) row.amount = a.amount;
    if (a.streak != null) row.streak = a.streak;
    if (a.opp) row.opp = a.opp;
    if (a.legendary) row.legendary = !!a.legendary;
    return row;
  });

  return { soldier, stats, tonight, catalog, benefits, titles, vacation, activity, prefs: {
    theme: profile.theme, palette: profile.palette, path: profile.path,
  } };
}

export async function fetchSnapshot() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('no session');
  // idempotent: provisions profile + stats + tonight on first load
  await supabase.rpc('app_ensure_profile');

  const [profile, statsRows, tonightRows, subsRows, titlesRows, actRows] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('stats').select('*').eq('user_id', user.id).order('ord'),
    supabase.from('tonight_quests').select('*').eq('user_id', user.id).order('ord'),
    supabase.from('user_subquests').select('*').eq('user_id', user.id),
    supabase.from('user_titles').select('*').eq('user_id', user.id),
    supabase.from('activity').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ]);
  const err = profile.error || statsRows.error || tonightRows.error || subsRows.error || titlesRows.error || actRows.error;
  if (err) throw err;

  return assembleSnapshot({
    profile: profile.data,
    statsRows: statsRows.data,
    tonightRows: tonightRows.data,
    subsRows: subsRows.data,
    titlesRows: titlesRows.data,
    actRows: actRows.data,
  });
}

// ── mutations (RPCs) ────────────────────────────────────────────────────
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}
export const toggleTonight  = (questId)               => rpc('app_toggle_tonight', { p_quest_id: questId });
export const toggleSubquest = (oppId, subId, verified) => rpc('app_toggle_subquest', { p_opp_id: oppId, p_subquest_id: subId, p_verified: !!verified });
export const addTonight     = (oppId)                  => rpc('app_add_tonight', { p_opp_id: oppId });
export const checkin        = (mood, energy)           => rpc('app_checkin', { p_mood: mood, p_energy: energy ?? null });
export const equipTitle     = (name)                   => rpc('app_equip_title', { p_name: name });

export async function setPrefs(prefs) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const patch = {};
  if (prefs.theme   != null) patch.theme   = prefs.theme;
  if (prefs.palette != null) patch.palette = prefs.palette;
  if (prefs.path    != null) patch.path    = prefs.path;
  if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', user.id);
}
