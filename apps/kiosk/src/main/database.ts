import Database from "better-sqlite3";
import type { OrderProjection } from "../shared/ipc";

export type StoredOrder = OrderProjection & { updated_at: string };

export type RedemptionRecord = {
  oid: string;
  ts: string;
  station_id: string;
  override: number;
};

export type StoredKey = {
  kid: string;
  public_b64: string;
  created_at: string;
  active: number;
};

export class KioskDatabase {
  private db: Database.Database;

  private upsertOrderStmt;
  private findOrderByCodeStmt;
  private findOrderByOidStmt;
  private searchOrdersStmt;
  private insertRedemptionStmt;
  private findFirstRedemptionStmt;
  private insertOutboxStmt;
  private listOutboxStmt;
  private deleteOutboxStmt;
  private countOutboxStmt;
  private updateKeysInactiveStmt;
  private upsertKeyStmt;
  private findActiveKeyStmt;
  private getMetaStmt;
  private setMetaStmt;

  constructor(file: string) {
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders_cache (
        oid TEXT PRIMARY KEY,
        jti TEXT NOT NULL,
        n TEXT NOT NULL,
        q INTEGER NOT NULL,
        e TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_orders_cache_jti ON orders_cache(jti);
      CREATE INDEX IF NOT EXISTS idx_orders_cache_name ON orders_cache(n);

      CREATE TABLE IF NOT EXISTS redemptions (
        oid TEXT NOT NULL,
        ts TEXT NOT NULL,
        station_id TEXT NOT NULL,
        override INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (oid, ts)
      );

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS keys (
        kid TEXT PRIMARY KEY,
        public_b64 TEXT NOT NULL,
        created_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    this.upsertOrderStmt = this.db.prepare(`
      INSERT INTO orders_cache (oid, jti, n, q, e, updated_at)
      VALUES (@oid, @jti, @n, @q, @e, @updated_at)
      ON CONFLICT(oid) DO UPDATE SET
        jti = excluded.jti,
        n = excluded.n,
        q = excluded.q,
        e = excluded.e,
        updated_at = excluded.updated_at
    `);

    this.findOrderByCodeStmt = this.db.prepare(
      `SELECT oid, jti, n, q, e, updated_at FROM orders_cache WHERE oid = ? OR jti = ?`
    );
    this.findOrderByOidStmt = this.db.prepare(
      `SELECT oid, jti, n, q, e, updated_at FROM orders_cache WHERE oid = ?`
    );
    this.searchOrdersStmt = this.db.prepare(
      `SELECT oid, jti, n, q, e FROM orders_cache
       WHERE oid LIKE ? ESCAPE '\\' OR jti LIKE ? ESCAPE '\\' OR n LIKE ? ESCAPE '\\'
       ORDER BY n LIMIT 25`
    );
    this.insertRedemptionStmt = this.db.prepare(
      `INSERT OR IGNORE INTO redemptions (oid, ts, station_id, override)
       VALUES (?, ?, ?, ?)`
    );
    this.findFirstRedemptionStmt = this.db.prepare(
      `SELECT oid, ts, station_id, override FROM redemptions
       WHERE oid = ? AND override = 0
       ORDER BY datetime(ts) ASC
       LIMIT 1`
    );
    this.insertOutboxStmt = this.db.prepare(
      `INSERT INTO outbox (payload, created_at) VALUES (?, ?)`
    );
    this.listOutboxStmt = this.db.prepare(
      `SELECT id, payload FROM outbox ORDER BY id`
    );
    this.deleteOutboxStmt = this.db.prepare(`DELETE FROM outbox WHERE id = ?`);
    this.countOutboxStmt = this.db.prepare(`SELECT COUNT(1) as count FROM outbox`);
    this.updateKeysInactiveStmt = this.db.prepare(`UPDATE keys SET active = 0`);
    this.upsertKeyStmt = this.db.prepare(
      `INSERT INTO keys (kid, public_b64, created_at, active)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(kid) DO UPDATE SET public_b64 = excluded.public_b64, created_at = excluded.created_at, active = 1`
    );
    this.findActiveKeyStmt = this.db.prepare(
      `SELECT kid, public_b64, created_at, active FROM keys WHERE active = 1 LIMIT 1`
    );
    this.getMetaStmt = this.db.prepare(`SELECT value FROM meta WHERE key = ?`);
    this.setMetaStmt = this.db.prepare(
      `INSERT INTO meta (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
  }

  upsertOrders(orders: OrderProjection[]) {
    const now = new Date().toISOString();
    const run = this.db.transaction((items: OrderProjection[]) => {
      for (const order of items) {
        this.upsertOrderStmt.run({ ...order, updated_at: now });
      }
    });
    run(orders);
  }

  storeOrder(order: OrderProjection) {
    this.upsertOrders([order]);
  }

  getOrderByCode(code: string): StoredOrder | undefined {
    return this.findOrderByCodeStmt.get(code, code) as StoredOrder | undefined;
  }

  getOrderByOid(oid: string): StoredOrder | undefined {
    return this.findOrderByOidStmt.get(oid) as StoredOrder | undefined;
  }

  searchOrders(term: string): OrderProjection[] {
    const escaped = term.replace(/[%_\\]/g, (char) => `\\${char}`);
    const likeTerm = `%${escaped}%`;
    return this.searchOrdersStmt.all(likeTerm, likeTerm, likeTerm) as OrderProjection[];
  }

  recordRedemption(oid: string, stationId: string, ts: string, override: boolean) {
    this.insertRedemptionStmt.run(oid, ts, stationId, override ? 1 : 0);
  }

  getFirstRedemption(oid: string): RedemptionRecord | undefined {
    return this.findFirstRedemptionStmt.get(oid) as RedemptionRecord | undefined;
  }

  enqueueOutbox(payload: unknown) {
    this.insertOutboxStmt.run(JSON.stringify(payload), new Date().toISOString());
  }

  listOutbox(): Array<{ id: number; payload: unknown }> {
    const rows = this.listOutboxStmt.all() as Array<{ id: number; payload: string }>;
    return rows.map((row) => ({ id: row.id, payload: JSON.parse(row.payload) }));
  }

  deleteOutbox(id: number) {
    this.deleteOutboxStmt.run(id);
  }

  countOutbox(): number {
    const row = this.countOutboxStmt.get() as { count: number } | undefined;
    return row?.count ?? 0;
  }

  setActiveKey(kid: string, publicB64: string) {
    const now = new Date().toISOString();
    const run = this.db.transaction(() => {
      this.updateKeysInactiveStmt.run();
      this.upsertKeyStmt.run(kid, publicB64, now);
    });
    run();
  }

  getActiveKey(): StoredKey | undefined {
    return this.findActiveKeyStmt.get() as StoredKey | undefined;
  }

  hasActiveKey(): boolean {
    return Boolean(this.getActiveKey());
  }

  getMeta(key: string): string | undefined {
    const row = this.getMetaStmt.get(key) as { value: string } | undefined;
    return row?.value;
  }

  setMeta(key: string, value: string) {
    this.setMetaStmt.run(key, value);
  }
}
