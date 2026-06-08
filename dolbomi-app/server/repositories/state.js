// Read assembler: builds the per-soldier snapshot in the exact shapes the
// frontend consumes. Opportunity `fill` is computed from persisted subquest
// state so progress bars reflect real, saved progress.
import { db } from '../db/index.js';

const bool = (v) => !!v;

export function getSoldier(soldierId) {
  const r = db.prepare(`SELECT * FROM soldiers WHERE id = ?`).get(soldierId);
  if (!r) return null;
  return {
    id: r.id, name: r.name, rank: r.rank, rankEn: r.rank_en, title: r.title,
    unit: r.unit, dday: r.dday, served: r.served, streak: r.streak,
    savingsNow: r.savings_now, savingsProjected: r.savings_projected, deltaMonth: r.delta_month,
  };
}

export function getStats(soldierId) {
  return db.prepare(`SELECT key, mil, en, real, cur, tgt FROM stats WHERE soldier_id = ? ORDER BY ord`)
    .all(soldierId);
}

export function getTonight(soldierId) {
  return db.prepare(`SELECT id, stat, txt, min, xp, hard, done FROM tonight_quests WHERE soldier_id = ? ORDER BY ord`)
    .all(soldierId)
    .map((q) => ({ id: q.id, stat: q.stat, txt: q.txt, min: q.min, xp: q.xp, hard: bool(q.hard), done: bool(q.done) }));
}

// Assemble catalog with milestones/subquests merged with per-soldier completion,
// and a computed fill% per opportunity.
export function getCatalog(soldierId) {
  const opps = db.prepare(`SELECT * FROM opportunities ORDER BY ord`).all();
  const msStmt = db.prepare(`SELECT id, title, date FROM milestones WHERE opp_id = ? ORDER BY ord`);
  const sqStmt = db.prepare(`SELECT id, milestone_id, text, size, xp, stat, service_json FROM subquests WHERE opp_id = ? ORDER BY ord`);
  const stateStmt = db.prepare(`SELECT subquest_id, done, verified FROM soldier_subquests WHERE soldier_id = ? AND opp_id = ?`);

  return opps.map((o) => {
    const state = {};
    for (const r of stateStmt.all(soldierId, o.id)) state[r.subquest_id] = r;
    const subByMs = {};
    let totXp = 0, doneXp = 0;
    for (const q of sqStmt.all(o.id)) {
      const st = state[q.id] || { done: 0, verified: 0 };
      const done = bool(st.done);
      totXp += q.xp; if (done) doneXp += q.xp;
      (subByMs[q.milestone_id] ||= []).push({
        id: q.id, text: q.text, size: q.size, xp: q.xp, stat: q.stat,
        done, verified: bool(st.verified),
        service: q.service_json ? JSON.parse(q.service_json) : null,
      });
    }
    const milestones = msStmt.all(o.id).map((m) => ({
      id: m.id, title: m.title, date: m.date, subquests: subByMs[m.id] || [],
    }));
    const fill = Math.round((doneXp / (totXp || 1)) * 100);
    return {
      id: o.id, cat: o.cat, stat: o.stat, title: o.title, hot: bool(o.hot),
      sub: o.sub, what: o.what, eligibility: o.eligibility, applyWhere: o.apply_where,
      source: o.source, verified: o.verified, cost: o.cost, dday: o.dday,
      started: bool(o.started), reward: JSON.parse(o.reward_json), why: o.why,
      expectedPct: o.expected_pct, status: o.status, img: o.img, fill, milestones,
    };
  });
}

export function getBenefits() {
  return db.prepare(`SELECT * FROM benefits ORDER BY ord`).all().map((b) => ({
    id: b.id, title: b.title, icon: b.icon, tone: b.tone, value: b.value,
    where: b.where_, tags: JSON.parse(b.tags_json || '[]'),
    oppId: b.opp_id || undefined, headline: bool(b.headline),
  }));
}

export function getTitles(soldierId) {
  return db.prepare(`
    SELECT t.name, t.descr, t.rarity, t.legendary, st.owned, st.equipped
    FROM titles t
    LEFT JOIN soldier_titles st ON st.title_name = t.name AND st.soldier_id = ?
    ORDER BY t.ord`).all(soldierId).map((t) => ({
      name: t.name, desc: t.descr, rarity: t.rarity,
      owned: bool(t.owned), equipped: bool(t.equipped), legendary: bool(t.legendary),
    }));
}

export function getActivity(soldierId) {
  return db.prepare(`SELECT day, time, type, stat, text, xp, amount, streak, opp, legendary
    FROM activity WHERE soldier_id = ? ORDER BY ord, id`).all(soldierId).map((a) => {
      const row = { day: a.day, time: a.time, type: a.type, text: a.text };
      if (a.stat) row.stat = a.stat;
      if (a.xp != null) row.xp = a.xp;
      if (a.amount != null) row.amount = a.amount;
      if (a.streak != null) row.streak = a.streak;
      if (a.opp) row.opp = a.opp;
      if (a.legendary) row.legendary = bool(a.legendary);
      return row;
    });
}

// Vacation ladder, derived from catalog (휴가 reward kind).
const MAXD = { startup: 5, toeic: 5, hanguksa: 3, cheryeok: 3, defai: 4 };
export function getVacation(soldierId) {
  const catalog = getCatalog(soldierId);
  const vac = catalog.filter((o) => o.reward.kind === '휴가');
  // secured = days banked from fully-completed vacation opps
  const secured = vac.reduce((n, o) => {
    const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
    return n + (allDone ? (MAXD[o.id] || 0) : 0);
  }, 0) || 4; // fall back to the prototype's baseline until one is fully cleared
  return {
    secured,
    ladder: vac.map((o) => ({ id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note })),
  };
}

export function getSnapshot(soldierId) {
  return {
    soldier: getSoldier(soldierId),
    stats: getStats(soldierId),
    tonight: getTonight(soldierId),
    catalog: getCatalog(soldierId),
    benefits: getBenefits(),
    titles: getTitles(soldierId),
    vacation: getVacation(soldierId),
    activity: getActivity(soldierId),
  };
}
