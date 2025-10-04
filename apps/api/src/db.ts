import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

const resolveDbPath = (url: string) => {
  if (url.startsWith("file:")) {
    return path.resolve(process.cwd(), url.slice("file:".length));
  }
  return path.resolve(process.cwd(), url);
};

const dbPath = resolveDbPath(env.DB_URL);
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const database: BetterSqliteDatabase = new Database(dbPath);
database.pragma("foreign_keys = ON");

database.exec(`
CREATE TABLE IF NOT EXISTS keys (
  kid TEXT PRIMARY KEY,
  public_key_b64 TEXT NOT NULL,
  private_key_b64 TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  oid TEXT PRIMARY KEY,
  n TEXT NOT NULL,
  email TEXT NOT NULL,
  items_json TEXT NOT NULL,
  q INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  jti TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  tip_cents INTEGER NOT NULL DEFAULT 0,
  token TEXT,
  signing_kid TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_jti ON orders(jti);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);

CREATE TABLE IF NOT EXISTS redemptions (
  oid TEXT PRIMARY KEY,
  station_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  override INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (oid) REFERENCES orders(oid)
);

CREATE TABLE IF NOT EXISTS voids (
  oid TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (oid) REFERENCES orders(oid)
);
`);

type TableColumn = { name: string };

const ensureColumn = (table: string, column: string, definition: string) => {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as TableColumn[];
  if (!columns.some((col) => col.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
};

ensureColumn("orders", "token", "token TEXT");
ensureColumn("orders", "signing_kid", "signing_kid TEXT");

export type DatabaseInstance = BetterSqliteDatabase;

export const db: DatabaseInstance = database;
