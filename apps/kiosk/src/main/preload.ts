import { contextBridge, ipcRenderer } from "electron";
import type {
  KioskApi,
  OrderProjection,
  OverrideResult,
  ScanResult,
  SyncResult,
  SyncSummary
} from "../shared/ipc";

const api: KioskApi = {
  submitScan(code: string) {
    return ipcRenderer.invoke("scan:submit", code) as Promise<ScanResult>;
  },
  triggerSync() {
    return ipcRenderer.invoke("sync:trigger") as Promise<SyncResult>;
  },
  getSummary() {
    return ipcRenderer.invoke("summary:get") as Promise<SyncSummary>;
  },
  searchOrders(term: string) {
    return ipcRenderer.invoke("orders:search", term) as Promise<OrderProjection[]>;
  },
  redeemOrder(oid: string) {
    return ipcRenderer.invoke("orders:redeem", oid) as Promise<ScanResult>;
  },
  overrideRedemption(oid: string) {
    return ipcRenderer.invoke("redeem:override", oid) as Promise<OverrideResult>;
  },
  onSummaryUpdate(cb: (summary: SyncSummary) => void) {
    const listener = (_: unknown, summary: SyncSummary) => {
      cb(summary);
    };

    ipcRenderer.on("summary:update", listener);

    return () => {
      ipcRenderer.off("summary:update", listener);
    };
  }
};

contextBridge.exposeInMainWorld("kiosk", api);
