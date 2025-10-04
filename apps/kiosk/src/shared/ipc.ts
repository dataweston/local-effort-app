export type OrderProjection = {
  oid: string;
  jti: string;
  n: string;
  q: number;
  e: string;
};

export type SyncSummary = {
  online: boolean;
  hasKey: boolean;
  outboxCount: number;
  lastSuccessfulSync?: string;
};

export type ScreenState =
  | { type: "idle" }
  | {
      type: "green";
      oid: string;
      name: string;
      quantity: number;
      humanCode: string;
      expiresAt: string;
      firstRedeemedAt: string;
      items: Array<{ name: string; quantity: number }>;
    }
  | {
      type: "yellow";
      oid: string;
      name: string;
      quantity: number;
      humanCode: string;
      firstRedeemedAt: string;
      stationId: string;
      items: Array<{ name: string; quantity: number }>;
    }
  | {
      type: "red";
      reason:
        | "invalid-token"
        | "expired"
        | "not-found"
        | "no-key"
        | "wrong-event";
      message: string;
    };

export type ScanResult = {
  state: ScreenState;
};

export type SyncResult = {
  ok: boolean;
  message?: string;
  summary: SyncSummary;
};

export type OverrideResult = {
  ok: boolean;
  state: ScreenState;
};

export type KioskApi = {
  submitScan(code: string): Promise<ScanResult>;
  triggerSync(): Promise<SyncResult>;
  getSummary(): Promise<SyncSummary>;
  searchOrders(term: string): Promise<OrderProjection[]>;
  redeemOrder(oid: string): Promise<ScanResult>;
  overrideRedemption(oid: string): Promise<OverrideResult>;
  onSummaryUpdate(cb: (summary: SyncSummary) => void): () => void;
};
