// Apply schema.sql (idempotent — uses CREATE TABLE IF NOT EXISTS).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(sql);
console.log('✓ migrated schema');
