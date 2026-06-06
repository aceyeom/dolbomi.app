// REST routes. /auth/login is public; everything under /api requires a token.
import { Router } from 'express';
import { db } from '../db/index.js';
import { verifyPassword, signToken, requireAuth } from '../auth.js';
import { getSnapshot } from '../repositories/state.js';
import { toggleTonight, toggleSubquest, addCheckin } from '../repositories/mutations.js';

export const router = Router();

// ── auth ──────────────────────────────────────────────────────────
router.post('/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'login and password required' });
  const row = db.prepare(`SELECT id, login, password_hash FROM soldiers WHERE login = ?`).get(login);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = signToken({ id: row.id, login: row.login });
  res.json({ token, soldierId: row.id });
});

// ── snapshot (everything the app needs to boot) ───────────────────
router.get('/api/state', requireAuth, (req, res) => {
  const snap = getSnapshot(req.soldierId);
  if (!snap.soldier) return res.status(404).json({ error: 'soldier not found' });
  res.json(snap);
});

// ── mutations ─────────────────────────────────────────────────────
router.post('/api/tonight/:questId/toggle', requireAuth, (req, res) => {
  const r = toggleTonight(req.soldierId, req.params.questId);
  if (r.error) return res.status(r.status || 400).json({ error: r.error });
  res.json(r);
});

router.post('/api/opportunities/:oppId/subquests/:subquestId/toggle', requireAuth, (req, res) => {
  const r = toggleSubquest(req.soldierId, req.params.oppId, req.params.subquestId, !!(req.body && req.body.verified));
  if (r.error) return res.status(r.status || 400).json({ error: r.error });
  res.json(r);
});

router.post('/api/checkin', requireAuth, (req, res) => {
  const { mood, energy } = req.body || {};
  if (!mood) return res.status(400).json({ error: 'mood required' });
  res.json(addCheckin(req.soldierId, mood, energy));
});

router.get('/api/health', (_req, res) => res.json({ ok: true }));
