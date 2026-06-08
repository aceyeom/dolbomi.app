// Write operations: quest/subquest toggles, check-ins. Each returns the fresh
// snapshot so the client can re-render from one source of truth.
import { db } from '../db/index.js';
import { getSnapshot, getTonight, getCatalog } from './state.js';

// Toggle one of tonight's quests. Logs an activity row on completion.
export function toggleTonight(soldierId, questId) {
  const q = db.prepare(`SELECT * FROM tonight_quests WHERE soldier_id = ? AND id = ?`).get(soldierId, questId);
  if (!q) return { error: 'quest not found', status: 404 };
  const nextDone = q.done ? 0 : 1;
  db.prepare(`UPDATE tonight_quests SET done = ? WHERE soldier_id = ? AND id = ?`).run(nextDone, soldierId, questId);
  if (nextDone) {
    db.prepare(`INSERT INTO activity (soldier_id, day, time, type, stat, text, xp, ord)
      VALUES (?, '오늘', strftime('%H:%M','now'), 'quest', ?, ?, ?, -1)`)
      .run(soldierId, q.stat, q.txt, q.xp);
  }
  return { tonight: getTonight(soldierId) };
}

// Toggle a subquest within an opportunity's plan. `verified` marks honest-tap
// vs verified completion (services). Recomputes fill via getCatalog.
export function toggleSubquest(soldierId, oppId, subquestId, verified) {
  const sq = db.prepare(`SELECT * FROM subquests WHERE opp_id = ? AND id = ?`).get(oppId, subquestId);
  if (!sq) return { error: 'subquest not found', status: 404 };
  const cur = db.prepare(`SELECT done FROM soldier_subquests WHERE soldier_id = ? AND opp_id = ? AND subquest_id = ?`)
    .get(soldierId, oppId, subquestId);
  const nextDone = cur && cur.done ? 0 : 1;
  const nextVerified = nextDone ? (verified ? 1 : 0) : 0;
  db.prepare(`
    INSERT INTO soldier_subquests (soldier_id, opp_id, subquest_id, done, verified, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(soldier_id, opp_id, subquest_id)
    DO UPDATE SET done = excluded.done, verified = excluded.verified, updated_at = datetime('now')
  `).run(soldierId, oppId, subquestId, nextDone, nextVerified);
  // return the single refreshed opportunity (with new fill) + full catalog
  const catalog = getCatalog(soldierId);
  return { catalog, opp: catalog.find((o) => o.id === oppId) };
}

// Record a daily check-in (mood). Updates streak + logs activity.
export function addCheckin(soldierId, moodKey, energy) {
  db.prepare(`INSERT INTO checkins (soldier_id, mood_key, energy) VALUES (?, ?, ?)`)
    .run(soldierId, moodKey, energy ?? null);
  const s = db.prepare(`SELECT streak FROM soldiers WHERE id = ?`).get(soldierId);
  const nextStreak = (s?.streak || 0) + 1;
  db.prepare(`UPDATE soldiers SET streak = ? WHERE id = ?`).run(nextStreak, soldierId);
  db.prepare(`INSERT INTO activity (soldier_id, day, time, type, text, streak, ord)
    VALUES (?, '오늘', strftime('%H:%M','now'), 'checkin', '오늘의 컨디션 체크인', ?, -1)`)
    .run(soldierId, nextStreak);
  return { snapshot: getSnapshot(soldierId) };
}
