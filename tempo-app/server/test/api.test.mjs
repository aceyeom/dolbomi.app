// API integration test: boots the server, logs in, fetches the snapshot,
// exercises mutations, and asserts shapes + persistence. Uses an isolated DB.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB = join(__dirname, 'test.db');
const PORT = 4099;
const BASE = `http://localhost:${PORT}`;

rmSync(TEST_DB, { force: true });
rmSync(TEST_DB + '-wal', { force: true });
rmSync(TEST_DB + '-shm', { force: true });

const server = spawn(process.execPath, [join(__dirname, '..', 'index.js')], {
  env: { ...process.env, PORT: String(PORT), TEMPO_DB: TEST_DB },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (d) => process.stderr.write(d));

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log(`✓ ${label}`); } else { fail++; console.log(`✗ ${label}`); } };

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

try {
  await waitForServer();

  // auth: bad creds rejected
  let r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'demo', password: 'wrong' }) });
  ok(r.status === 401, 'login rejects bad password');

  // auth: good creds
  r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'demo', password: 'tempo' }) });
  const { token } = await r.json();
  ok(r.ok && token, 'login returns token');

  const auth = { Authorization: `Bearer ${token}` };

  // protected route requires token
  r = await fetch(`${BASE}/api/state`);
  ok(r.status === 401, '/api/state requires auth');

  // snapshot shape
  r = await fetch(`${BASE}/api/state`, { headers: auth });
  const snap = await r.json();
  ok(snap.soldier?.name === '김도현', 'snapshot soldier name');
  ok(snap.stats?.length === 6, 'snapshot has 6 stats');
  ok(snap.tonight?.length === 3, 'snapshot has 3 tonight quests');
  ok(Array.isArray(snap.catalog) && snap.catalog.length === 10, 'snapshot catalog (10 opps)');
  ok(snap.benefits?.length === 8, 'snapshot benefits (8)');
  ok(snap.titles?.length === 6, 'snapshot titles (6)');
  ok(typeof snap.vacation?.secured === 'number', 'snapshot vacation.secured');
  ok(snap.activity?.length >= 9, 'snapshot activity log');
  const startup = snap.catalog.find((o) => o.id === 'startup');
  ok(startup && startup.reward.kind === '휴가' && typeof startup.fill === 'number', 'opportunity shape (reward+fill)');
  ok(startup.milestones[0].subquests[0].text, 'milestones/subquests nested');

  // mutation: toggle a not-done subquest → fill increases + persists
  const opp = snap.catalog.find((o) => o.id === 'toeic');
  const target = opp.milestones.flatMap((m) => m.subquests).find((s) => !s.done);
  const fillBefore = opp.fill;
  r = await fetch(`${BASE}/api/opportunities/toeic/subquests/${target.id}/toggle`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{}' });
  const tg = await r.json();
  const oppAfter = tg.catalog.find((o) => o.id === 'toeic');
  ok(oppAfter.fill > fillBefore, `subquest toggle raises fill (${fillBefore}→${oppAfter.fill})`);

  // persistence: re-fetch snapshot, the toggle survived
  r = await fetch(`${BASE}/api/state`, { headers: auth });
  const snap2 = await r.json();
  const persisted = snap2.catalog.find((o) => o.id === 'toeic').milestones.flatMap((m) => m.subquests).find((s) => s.id === target.id);
  ok(persisted.done === true, 'subquest completion persisted across requests');

  // mutation: tonight toggle logs activity
  const q0 = snap.tonight[0];
  r = await fetch(`${BASE}/api/tonight/${q0.id}/toggle`, { method: 'POST', headers: auth });
  const tn = await r.json();
  ok(tn.tonight.find((q) => q.id === q0.id).done === true, 'tonight quest toggles done');

  // mutation: checkin raises streak
  const streakBefore = snap.soldier.streak;
  r = await fetch(`${BASE}/api/checkin`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ mood: 'good', energy: 3 }) });
  const ci = await r.json();
  ok(ci.snapshot.soldier.streak === streakBefore + 1, `checkin raises streak (${streakBefore}→${ci.snapshot.soldier.streak})`);
} catch (e) {
  console.log('✗ HARNESS ERROR:', e.stack || e);
  fail++;
} finally {
  server.kill();
  rmSync(TEST_DB, { force: true });
  rmSync(TEST_DB + '-wal', { force: true });
  rmSync(TEST_DB + '-shm', { force: true });
}

console.log(fail ? `\n${fail} failure(s), ${pass} passed` : `\nAll ${pass} API checks passed ✓`);
process.exit(fail ? 1 : 0);
