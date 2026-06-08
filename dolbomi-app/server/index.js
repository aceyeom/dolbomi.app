// DOLBOMI API server. Auto-migrates + seeds an empty DB on first boot so a fresh
// checkout runs with `npm start` and no manual steps.
import express from 'express';
import cors from 'cors';
import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { router } from './routes/api.js';
import { DB_PATH, db } from './db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
// Resolved path to the Vite build output (one level up from server/)
const DIST = join(__dirname, '..', 'dist');

// first-run bootstrap: migrate + seed if the DB is missing or empty
function ensureDb() {
  const fresh = !existsSync(DB_PATH) || statSync(DB_PATH).size === 0;
  const hasTable = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='soldiers'`).get();
  const empty = hasTable ? !db.prepare(`SELECT 1 FROM soldiers LIMIT 1`).get() : true;
  if (fresh || !hasTable) execFileSync(process.execPath, [join(__dirname, 'db/migrate.js')], { stdio: 'inherit' });
  if (empty) execFileSync(process.execPath, [join(__dirname, 'db/seed.js')], { stdio: 'inherit' });
}
ensureDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(router);

// Serve the Vite build in production (single-service deploy on Render).
// In dev the Vite dev server handles the frontend instead.
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback — let React Router handle client-side routes
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')));
}

app.listen(PORT, () => console.log(`✓ DOLBOMI API on http://localhost:${PORT}`));
