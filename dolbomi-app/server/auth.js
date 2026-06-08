// Auth: scrypt password hashing + JWT issue/verify. No external hashing dep.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.DOLBOMI_JWT_SECRET || 'dev-dolbomi-secret-change-in-prod';
const TOKEN_TTL = '7d';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return candidate.length === known.length && timingSafeEqual(candidate, known);
}

export function signToken(soldier) {
  return jwt.sign({ sub: soldier.id, login: soldier.login }, SECRET, { expiresIn: TOKEN_TTL });
}

// Express middleware: requires a valid Bearer token, sets req.soldierId.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.soldierId = payload.sub;
    req.login = payload.login;
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}
