// The app's own writable data: users, sessions, the permission matrix,
// flavours and sub-products. The POS (SQL Server) login is read-only, so this
// lives in a separate SQLite database:
//   - Turso (hosted SQLite) when TURSO_DATABASE_URL is set - production on Vercel,
//     where the filesystem is not kept between requests;
//   - otherwise the local file api/data/app.db (or APP_DB_PATH), for offline development.
import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function connect() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  const file = process.env.APP_DB_PATH
    || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/app.db');
  mkdirSync(path.dirname(file), { recursive: true });
  return createClient({ url: pathToFileURL(file).href });
}

const client = connect();

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id                    TEXT PRIMARY KEY,
    email                 TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash         TEXT NOT NULL,
    role                  TEXT NOT NULL DEFAULT 'viewer',
    must_change_password  INTEGER NOT NULL DEFAULT 1,
    suspended             INTEGER NOT NULL DEFAULT 0,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_sign_in_at       TEXT
  )`,
  // Only a SHA-256 of the session token is stored, so a copy of this database
  // cannot be used to hijack a live session.
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role        TEXT PRIMARY KEY,
    pages       TEXT NOT NULL DEFAULT '[]',   -- JSON array of page ids
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS flavours (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    code        TEXT NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  // One row per (POS product x flavour x location); see catalog.js.
  `CREATE TABLE IF NOT EXISTS product_variants (
    item_code       TEXT NOT NULL,
    flavour_id      INTEGER NOT NULL REFERENCES flavours(id) ON DELETE RESTRICT,
    location        TEXT NOT NULL CHECK (location IN ('HCM','One_Galle_Face','Hill_Street','Gym_Store')),
    qty             INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
    price           REAL CHECK (price IS NULL OR price >= 0),
    visible_on_web  INTEGER NOT NULL DEFAULT 1,
    active          INTEGER NOT NULL DEFAULT 1,
    image_url       TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (item_code, flavour_id, location)
  )`,
  'CREATE INDEX IF NOT EXISTS product_variants_location_idx ON product_variants (location, qty)',
];

// Created once per process (one round trip); every query waits for it. A
// failure (database unreachable) is not cached, so the next request retries.
let ready;
const init = () => {
  ready ??= client.batch(SCHEMA, 'write').catch((error) => { ready = undefined; throw error; });
  return ready;
};

const plain = (result, row) => Object.fromEntries(result.columns.map((name, index) => [name, row[index]]));

async function execute(sql, args) {
  await init();
  return client.execute({ sql, args });
}

/** First matching row as a plain object, or undefined. */
export async function get(sql, ...args) {
  const result = await execute(sql, args);
  return result.rows[0] ? plain(result, result.rows[0]) : undefined;
}

/** Every matching row as plain objects. */
export async function all(sql, ...args) {
  const result = await execute(sql, args);
  return result.rows.map((row) => plain(result, row));
}

/** A write. Returns how many rows changed and the id of an inserted row. */
export async function run(sql, ...args) {
  const result = await execute(sql, args);
  return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid === undefined ? undefined : Number(result.lastInsertRowid) };
}

// SQLite has no boolean type; turn these 0/1 columns back into true/false for JSON.
const BOOLEAN_COLUMNS = ['active', 'visible_on_web', 'suspended', 'must_change_password'];
export function toRow(row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of BOOLEAN_COLUMNS) if (key in out) out[key] = Boolean(out[key]);
  return out;
}

export const now = () => new Date().toISOString();
