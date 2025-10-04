import type { KioskApi } from "../shared/ipc";

declare global {
  interface Window {
    kiosk: KioskApi;
  }
}
