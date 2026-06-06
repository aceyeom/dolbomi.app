// Seed the DB from the frontend data module (single source of truth) plus a
// demo soldier with login `demo` / password `tempo`.
import { db } from './index.js';
import { hashPassword } from '../auth.js';
import * as T from '../../src/data/index.js';

const reset = (table) => db.prepare(`DELETE FROM ${table}`).run();

const seed = db.transaction(() => {
  // wipe (order respects FKs)
  [
    'activity', 'checkins', 'soldier_titles', 'soldier_subquests',
    'tonight_quests', 'stats', 'subquests', 'milestones', 'opportunities',
    'benefits', 'titles', 'soldiers',
  ].forEach(reset);

  // ── demo soldier ────────────────────────────────────────────────
  const s = T.soldier;
  const { id: soldierId } = db.prepare(`
    INSERT INTO soldiers (login, password_hash, name, rank, rank_en, title, unit,
      dday, served, streak, savings_now, savings_projected, delta_month)
    VALUES (@login, @password_hash, @name, @rank, @rank_en, @title, @unit,
      @dday, @served, @streak, @savings_now, @savings_projected, @delta_month)
    RETURNING id
  `).get({
    login: 'demo', password_hash: hashPassword('tempo'),
    name: s.name, rank: s.rank, rank_en: s.rankEn, title: s.title, unit: s.unit,
    dday: s.dday, served: s.served, streak: s.streak,
    savings_now: s.savingsNow, savings_projected: s.savingsProjected, delta_month: s.deltaMonth,
  });

  // ── stats ───────────────────────────────────────────────────────
  const insStat = db.prepare(`INSERT INTO stats (soldier_id, key, mil, en, real, cur, tgt, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  T.stats.forEach((st, i) => insStat.run(soldierId, st.key, st.mil, st.en, st.real, st.cur, st.tgt, i));

  // ── catalog → opportunities / milestones / subquests ────────────
  const insOpp = db.prepare(`INSERT INTO opportunities
    (id, cat, stat, title, hot, sub, what, eligibility, apply_where, source, verified,
     cost, dday, started, reward_json, why, expected_pct, status, img, ord)
    VALUES (@id,@cat,@stat,@title,@hot,@sub,@what,@eligibility,@apply_where,@source,@verified,
     @cost,@dday,@started,@reward_json,@why,@expected_pct,@status,@img,@ord)`);
  const insMs = db.prepare(`INSERT INTO milestones (id, opp_id, title, date, ord)
    VALUES (?, ?, ?, ?, ?)`);
  const insSq = db.prepare(`INSERT INTO subquests
    (id, opp_id, milestone_id, text, size, xp, stat, default_done, service_json, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insSss = db.prepare(`INSERT INTO soldier_subquests (soldier_id, opp_id, subquest_id, done, verified)
    VALUES (?, ?, ?, ?, ?)`);

  T.catalog.forEach((o, oi) => {
    insOpp.run({
      id: o.id, cat: o.cat, stat: o.stat, title: o.title, hot: o.hot ? 1 : 0,
      sub: o.sub, what: o.what, eligibility: o.eligibility, apply_where: o.applyWhere,
      source: o.source, verified: o.verified, cost: o.cost, dday: o.dday,
      started: o.started ? 1 : 0, reward_json: JSON.stringify(o.reward), why: o.why,
      expected_pct: o.expectedPct, status: o.status, img: o.img, ord: oi,
    });
    o.milestones.forEach((m, mi) => {
      insMs.run(m.id, o.id, m.title, m.date, mi);
      m.subquests.forEach((q, qi) => {
        insSq.run(q.id, o.id, m.id, q.text, q.size, q.xp, q.stat,
          q.done ? 1 : 0, q.service ? JSON.stringify(q.service) : null, qi);
        // seed per-soldier state from prototype's default completion
        insSss.run(soldierId, o.id, q.id, q.done ? 1 : 0, q.verified ? 1 : 0);
      });
    });
  });

  // ── tonight ─────────────────────────────────────────────────────
  const insTon = db.prepare(`INSERT INTO tonight_quests (id, soldier_id, stat, txt, min, xp, hard, done, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  T.tonight.forEach((q, i) => insTon.run(q.id, soldierId, q.stat, q.txt, q.min, q.xp, q.hard ? 1 : 0, q.done ? 1 : 0, i));

  // ── benefits ────────────────────────────────────────────────────
  const insBen = db.prepare(`INSERT INTO benefits (id, title, icon, tone, value, where_, tags_json, opp_id, headline, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  T.benefits.forEach((b, i) => insBen.run(b.id, b.title, b.icon, b.tone, b.value, b.where,
    JSON.stringify(b.tags || []), b.oppId || null, b.headline ? 1 : 0, i));

  // ── titles ──────────────────────────────────────────────────────
  const insTitle = db.prepare(`INSERT INTO titles (name, descr, rarity, legendary, ord) VALUES (?, ?, ?, ?, ?)`);
  const insST = db.prepare(`INSERT INTO soldier_titles (soldier_id, title_name, owned, equipped) VALUES (?, ?, ?, ?)`);
  T.titles.forEach((t, i) => {
    insTitle.run(t.name, t.desc, t.rarity, t.legendary ? 1 : 0, i);
    insST.run(soldierId, t.name, t.owned ? 1 : 0, t.equipped ? 1 : 0);
  });

  // ── activity ────────────────────────────────────────────────────
  const insAct = db.prepare(`INSERT INTO activity
    (soldier_id, day, time, type, stat, text, xp, amount, streak, opp, legendary, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  T.activity.forEach((a, i) => insAct.run(soldierId, a.day, a.time, a.type, a.stat || null,
    a.text, a.xp ?? null, a.amount ?? null, a.streak ?? null, a.opp || null,
    a.legendary ? 1 : 0, i));
});

seed();
console.log('✓ seeded demo soldier (login: demo / password: tempo)');
