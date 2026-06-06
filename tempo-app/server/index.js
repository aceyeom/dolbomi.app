// TEMPO API server. Auto-migrates + seeds an empty DB on first boot so a fresh
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

app.listen(PORT, () => console.log(`✓ TEMPO API on http://localhost:${PORT}`));
