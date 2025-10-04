import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { verifyToken } from "@local-effort/shared";
import type {
  OrderProjection,
  OverrideResult,
  ScanResult,
  ScreenState,
  SyncResult,
  SyncSummary
} from "../shared/ipc";
import { KioskDatabase } from "./database";

const GRACE_WINDOW_MS = 90 * 60 * 1000;
const DEFAULT_SYNC_INTERVAL_MS = 60_000;

const runtimeDir = __dirname;
type RedScreen = Extract<ScreenState, { type: "red" }>;

type Config = {
  stationId: string;
  apiBase: string;
  eventId: string;
  dbPath: string;
  syncIntervalMs: number;
};

type CheckoutPayload = {
  oid: string;
  station_id: string;
  ts: string;
  override: boolean;
};

class KioskRuntime {
  private db: KioskDatabase;
  private config: Config;
  private window: BrowserWindow | null = null;
  private summary: SyncSummary;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(db: KioskDatabase, config: Config) {
    this.db = db;
    this.config = config;
    this.summary = {
      online: false,
      hasKey: this.db.hasActiveKey(),
      outboxCount: this.db.countOutbox()
    };
  }

  setWindow(window: BrowserWindow) {
    this.window = window;
    this.publishSummary();
  }

  start() {
    this.scheduleSync();
    void this.syncInternal();
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  getSummary(): SyncSummary {
    return this.summary;
  }

  async handleScan(raw: string): Promise<ScanResult> {
    const code = raw.trim();

    if (!code) {
      return { state: { type: "idle" } };
    }

    if (code.includes(".")) {
      return this.handleToken(code);
    }

    return this.handleManualCode(code);
  }

  async redeemOrder(oid: string): Promise<ScanResult> {
    const order = this.db.getOrderByOid(oid);

    if (!order) {
      return this.redState("not-found", "Order not found. Ask guest to visit the help desk.");
    }

    return this.completeRedemption(order, { override: false });
  }

  async overrideRedemption(oid: string): Promise<OverrideResult> {
    const order = this.db.getOrderByOid(oid);

    if (!order) {
      return {
        ok: false,
        state: { type: "red", reason: "not-found", message: "Unable to locate order for override." }
      };
    }

    const result = await this.completeRedemption(order, { override: true });
    return { ok: result.state.type === "green", state: result.state };
  }

  searchOrders(term: string): OrderProjection[] {
    if (!term.trim()) {
      return [];
    }

    return this.db.searchOrders(term.trim());
  }

  async triggerSync(): Promise<SyncResult> {
    const result = await this.syncInternal();
    return result;
  }

  private async handleToken(token: string): Promise<ScanResult> {
    const key = this.db.getActiveKey();

    if (!key) {
      return this.redState(
        "no-key",
        "Missing signing key. Press F5 to sync, then try scanning again."
      );
    }

    const publicBytes = new Uint8Array(Buffer.from(key.public_b64, "base64"));
    const verification = await verifyToken(token, publicBytes);

    if (!verification.ok || verification.payload.t !== "sando") {
      return this.redState(
        "invalid-token",
        "Unable to verify QR code signature. Ask guest to visit the help desk."
      );
    }

    if (verification.payload.v && verification.payload.v !== this.config.eventId) {
      return this.redState(
        "wrong-event",
        "This QR code is for a different event. Send guest to the help desk."
      );
    }

    const { payload } = verification;

    const order: OrderProjection = {
      oid: payload.oid,
      jti: payload.jti,
      n: payload.n,
      q: payload.q,
      e: payload.e
    };

    this.db.storeOrder(order);

    return this.completeRedemption(order, { override: false });
  }

  private async handleManualCode(code: string): Promise<ScanResult> {
    const order = this.db.getOrderByCode(code);

    if (!order) {
      return this.redState(
        "not-found",
        "Code not found. Ask guest to confirm their email or visit the help desk."
      );
    }

    return this.completeRedemption(order, { override: false });
  }

  private async completeRedemption(
    order: OrderProjection,
    { override }: { override: boolean }
  ): Promise<ScanResult> {
    const now = Date.now();
    const expiresAt = Date.parse(order.e);

    if (Number.isNaN(expiresAt) || now > expiresAt + GRACE_WINDOW_MS) {
      return this.redState(
        "expired",
        "Pickup window closed. Ask guest to visit the help desk."
      );
    }

    const existing = this.db.getFirstRedemption(order.oid);

    if (!existing || override) {
      const ts = new Date().toISOString();
      this.db.recordRedemption(order.oid, this.config.stationId, ts, override);
      this.db.enqueueOutbox(this.buildOutboxPayload(order.oid, ts, override));
      this.publishSummary();
      return {
        state: {
          type: "green",
          oid: order.oid,
          name: order.n,
          quantity: order.q,
          humanCode: order.jti,
          expiresAt: order.e,
          firstRedeemedAt: ts,
          items: [{ name: "Sandwich", quantity: order.q }]
        }
      };
    }

    return {
      state: {
        type: "yellow",
        oid: order.oid,
        name: order.n,
        quantity: order.q,
        humanCode: order.jti,
        firstRedeemedAt: existing.ts,
        stationId: existing.station_id,
        items: [{ name: "Sandwich", quantity: order.q }]
      }
    };
  }

  private buildOutboxPayload(oid: string, ts: string, override: boolean): CheckoutPayload {
    return {
      oid,
      station_id: this.config.stationId,
      ts,
      override
    };
  }

  private redState(reason: RedScreen["reason"], message: string): ScanResult {
    return {
      state: {
        type: "red",
        reason,
        message
      }
    };
  }

  private scheduleSync() {
    this.syncTimer = setInterval(() => {
      void this.syncInternal();
    }, this.config.syncIntervalMs);
  }

  private async syncInternal(): Promise<SyncResult> {
    try {
      await this.pullKey();
      await this.pullOrders();
      await this.flushOutbox();
      const now = new Date().toISOString();
      this.summary = {
        online: true,
        hasKey: this.db.hasActiveKey(),
        outboxCount: this.db.countOutbox(),
        lastSuccessfulSync: now
      };
      this.publishSummary();
      return { ok: true, summary: this.summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      this.summary = {
        online: false,
        hasKey: this.db.hasActiveKey(),
        outboxCount: this.db.countOutbox(),
        lastSuccessfulSync: this.summary.lastSuccessfulSync
      };
      this.publishSummary();
      return { ok: false, message, summary: this.summary };
    }
  }

  private publishSummary() {
    this.summary = {
      ...this.summary,
      hasKey: this.db.hasActiveKey(),
      outboxCount: this.db.countOutbox()
    };

    if (this.window) {
      this.window.webContents.send("summary:update", this.summary);
    }
  }

  private async pullKey() {
    const url = new URL("/keys/current", this.config.apiBase);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Key sync failed (${response.status})`);
    }

    const body = (await response.json()) as {
      kid: string;
      alg: string;
      publicKeyB64: string;
    };

    if (!body?.kid || !body?.publicKeyB64) {
      throw new Error("Key sync returned an invalid payload");
    }

    this.db.setActiveKey(body.kid, body.publicKeyB64);
  }

  private async pullOrders() {
    const url = new URL("/orders", this.config.apiBase);
    url.searchParams.set("event_id", this.config.eventId);
    const since = this.db.getMeta("orders_since") ?? new Date(0).toISOString();
    url.searchParams.set("since", since);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Order sync failed (${response.status})`);
    }

    const orders = (await response.json()) as OrderProjection[];
    this.db.upsertOrders(orders);
    this.db.setMeta("orders_since", new Date().toISOString());
  }

  private async flushOutbox() {
    const entries = this.db.listOutbox();

    for (const entry of entries) {
      const response = await fetch(new URL("/checkin", this.config.apiBase), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry.payload)
      });

      if (!response.ok) {
        throw new Error(`Check-in sync failed (${response.status})`);
      }

      this.db.deleteOutbox(entry.id);
      await delay(10);
    }
  }
}

function parseArgs(): Config {
  const defaults = {
    stationId: "LOCAL-TEST",
    apiBase: process.env.API_BASE_URL ?? "http://localhost:4000",
    eventId: process.env.EVENT_ID ?? "",
    dbPath: path.join(app.getPath("userData"), "kiosk.db"),
    syncIntervalMs: DEFAULT_SYNC_INTERVAL_MS
  } satisfies Config;

  const args = process.argv.slice(2);
  const result: Partial<Config> = {};

  for (const arg of args) {
    if (arg.startsWith("--station-id=")) {
      result.stationId = arg.split("=")[1] ?? defaults.stationId;
    } else if (arg.startsWith("--api=")) {
      result.apiBase = arg.split("=")[1] ?? defaults.apiBase;
    } else if (arg.startsWith("--event-id=")) {
      result.eventId = arg.split("=")[1] ?? defaults.eventId;
    } else if (arg.startsWith("--db=")) {
      result.dbPath = path.resolve(arg.split("=")[1] ?? defaults.dbPath);
    } else if (arg.startsWith("--sync-interval-ms=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (!Number.isNaN(value) && value > 0) {
        result.syncIntervalMs = value;
      }
    }
  }

  return {
    stationId: result.stationId ?? defaults.stationId,
    apiBase: result.apiBase ?? defaults.apiBase,
    eventId: result.eventId ?? defaults.eventId,
    dbPath: result.dbPath ?? defaults.dbPath,
    syncIntervalMs: result.syncIntervalMs ?? defaults.syncIntervalMs
  };
}

async function createWindow(runtime: KioskRuntime) {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(runtimeDir, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  runtime.setWindow(window);

  const devServerUrl = process.env.KIOSK_DEV_SERVER_URL;

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
  } else {
    await window.loadFile(path.join(runtimeDir, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  const config = parseArgs();
  const db = new KioskDatabase(config.dbPath);
  const runtime = new KioskRuntime(db, config);

  await createWindow(runtime);

  runtime.start();

  ipcMain.handle("scan:submit", (_, value: string) => runtime.handleScan(value));
  ipcMain.handle("orders:redeem", (_, oid: string) => runtime.redeemOrder(oid));
  ipcMain.handle("orders:search", (_, term: string) => runtime.searchOrders(term));
  ipcMain.handle("redeem:override", (_, oid: string) => runtime.overrideRedemption(oid));
  ipcMain.handle("sync:trigger", () => runtime.triggerSync());
  ipcMain.handle("summary:get", () => runtime.getSummary());

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(runtime);
    }
  });

  app.on("before-quit", () => {
    runtime.stop();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
