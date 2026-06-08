// SQLite connection (better-sqlite3). One file DB, WAL for concurrent reads.
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DOLBOMI_DB || join(__dirname, '..', 'dolbomi.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
