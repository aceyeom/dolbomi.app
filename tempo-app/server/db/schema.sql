-- TEMPO schema. Standard SQL; mirrors the frontend data shapes.
-- Reference tables (catalog/benefits/title defs) + per-soldier mutable state.
-- Swap better-sqlite3 → Postgres: change AUTOINCREMENT→SERIAL, INTEGER bool→BOOLEAN.

PRAGMA foreign_keys = ON;

-- ── identity ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soldiers (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  login              TEXT UNIQUE NOT NULL,
  password_hash      TEXT NOT NULL,
  name               TEXT NOT NULL,
  rank               TEXT NOT NULL,
  rank_en            TEXT NOT NULL,
  title              TEXT NOT NULL,
  unit               TEXT NOT NULL,
  dday               INTEGER NOT NULL,
  served             REAL NOT NULL,
  streak             INTEGER NOT NULL DEFAULT 0,
  savings_now        INTEGER NOT NULL DEFAULT 0,
  savings_projected  INTEGER NOT NULL DEFAULT 0,
  delta_month        INTEGER NOT NULL DEFAULT 0
);

-- ── six stats (per soldier) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats (
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  mil         TEXT NOT NULL,
  en          TEXT NOT NULL,
  real        TEXT NOT NULL,
  cur         INTEGER NOT NULL,
  tgt         INTEGER NOT NULL,
  ord         INTEGER NOT NULL,
  PRIMARY KEY (soldier_id, key)
);

-- ── opportunity catalog (reference) ───────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id           TEXT PRIMARY KEY,
  cat          TEXT NOT NULL,
  stat         TEXT NOT NULL,
  title        TEXT NOT NULL,
  hot          INTEGER NOT NULL DEFAULT 0,
  sub          TEXT,
  what         TEXT,
  eligibility  TEXT,
  apply_where  TEXT,
  source       TEXT,
  verified     TEXT,
  cost         TEXT,
  dday         INTEGER NOT NULL,
  started      INTEGER NOT NULL DEFAULT 0,
  reward_json  TEXT NOT NULL,        -- {kind,finish,label,note}
  why          TEXT,
  expected_pct INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'on',
  img          TEXT,
  ord          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id      TEXT NOT NULL,
  opp_id  TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  date    TEXT,
  ord     INTEGER NOT NULL,
  PRIMARY KEY (opp_id, id)
);

CREATE TABLE IF NOT EXISTS subquests (
  id            TEXT NOT NULL,
  opp_id        TEXT NOT NULL,
  milestone_id  TEXT NOT NULL,
  text          TEXT NOT NULL,
  size          TEXT NOT NULL,
  xp            INTEGER NOT NULL,
  stat          TEXT NOT NULL,
  default_done  INTEGER NOT NULL DEFAULT 0,
  service_json  TEXT,
  ord           INTEGER NOT NULL,
  PRIMARY KEY (opp_id, id),
  FOREIGN KEY (opp_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- per-soldier subquest completion (overrides default_done)
CREATE TABLE IF NOT EXISTS soldier_subquests (
  soldier_id   INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  opp_id       TEXT NOT NULL,
  subquest_id  TEXT NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  verified     INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (soldier_id, opp_id, subquest_id)
);

-- ── tonight's quests (per soldier) ────────────────────────────────
CREATE TABLE IF NOT EXISTS tonight_quests (
  id          TEXT NOT NULL,
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  stat        TEXT NOT NULL,
  txt         TEXT NOT NULL,
  min         INTEGER NOT NULL,
  xp          INTEGER NOT NULL,
  hard        INTEGER NOT NULL DEFAULT 0,
  done        INTEGER NOT NULL DEFAULT 0,
  ord         INTEGER NOT NULL,
  PRIMARY KEY (soldier_id, id)
);

-- ── benefits (reference) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefits (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  icon      TEXT NOT NULL,
  tone      TEXT,
  value     TEXT,
  where_    TEXT,
  tags_json TEXT,
  opp_id    TEXT,
  headline  INTEGER NOT NULL DEFAULT 0,
  ord       INTEGER NOT NULL
);

-- ── titles (def + per-soldier ownership) ──────────────────────────
CREATE TABLE IF NOT EXISTS titles (
  name      TEXT PRIMARY KEY,
  descr     TEXT NOT NULL,
  rarity    TEXT NOT NULL,
  legendary INTEGER NOT NULL DEFAULT 0,
  ord       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS soldier_titles (
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  title_name  TEXT NOT NULL REFERENCES titles(name) ON DELETE CASCADE,
  owned       INTEGER NOT NULL DEFAULT 0,
  equipped    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (soldier_id, title_name)
);

-- ── check-ins (mood) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  mood_key    TEXT NOT NULL,
  energy      INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── activity log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  day         TEXT NOT NULL,
  time        TEXT NOT NULL,
  type        TEXT NOT NULL,
  stat        TEXT,
  text        TEXT NOT NULL,
  xp          INTEGER,
  amount      INTEGER,
  streak      INTEGER,
  opp         TEXT,
  legendary   INTEGER,
  ord         INTEGER NOT NULL DEFAULT 0
);
