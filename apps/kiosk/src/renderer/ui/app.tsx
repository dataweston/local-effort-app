import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { OrderProjection, ScreenState, SyncSummary } from "../../shared/ipc";
import "./app.css";

const IDLE_STATE: ScreenState = { type: "idle" };

const AUTO_CLEAR_MS = 1500;

export function App() {
  const [screen, setScreen] = useState<ScreenState>(IDLE_STATE);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<OrderProjection[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    focusInput();

    const unsubscribe = window.kiosk.onSummaryUpdate(setSummary);

    window.kiosk
      .getSummary()
      .then((value) => setSummary(value))
      .catch(() => {
        setSummary({ online: false, hasKey: false, outboxCount: 0 });
      });

    const onFocus = () => focusInput();
    const onClick = () => focusInput();

    window.addEventListener("focus", onFocus);
    window.addEventListener("click", onClick);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (screen.type === "green") {
      const timeout = window.setTimeout(() => {
        setScreen(IDLE_STATE);
      }, AUTO_CLEAR_MS);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [screen]);

  useEffect(() => {
    if (syncFeedback) {
      const timeout = window.setTimeout(() => setSyncFeedback(null), 2500);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [syncFeedback]);

  useEffect(() => {
    if (searchOpen) {
      setSearchResults([]);
      setSearchTerm("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        event.preventDefault();
        void handleSync();
      } else if (event.key === "F2") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "F9" && screen.type === "yellow") {
        event.preventDefault();
        void handleOverride();
      } else if (event.key === "Escape" && searchOpen) {
        event.preventDefault();
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [screen, searchOpen]);

  const statusDotClass = useMemo(() => {
    if (!summary?.hasKey) {
      return "status-dot status-dot--error";
    }

    if (!summary.online) {
      return "status-dot status-dot--warn";
    }

    return "status-dot status-dot--ok";
  }, [summary]);

  const lastSyncLabel = useMemo(() => {
    if (!summary?.lastSuccessfulSync) {
      return "Sync pending";
    }

    const date = new Date(summary.lastSuccessfulSync);
    return `Last sync ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }, [summary]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = inputValue.trim();
    if (!code) {
      return;
    }

    try {
      const result = await window.kiosk.submitScan(code);
      setScreen(result.state);
    } finally {
      setInputValue("");
      inputRef.current?.focus();
    }
  };

  const handleSync = async () => {
    const result = await window.kiosk.triggerSync();
    setSummary(result.summary);
    setSyncFeedback(result.ok ? "Sync complete" : `Sync failed: ${result.message ?? "Unknown error"}`);
  };

  const handleOverride = async () => {
    if (screen.type !== "yellow") {
      return;
    }

    const result = await window.kiosk.overrideRedemption(screen.oid);
    setScreen(result.state);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const performSearch = useCallback(async (term: string) => {
    const value = term.trim();
    if (!value) {
      setSearchResults([]);
      return;
    }

    const results = await window.kiosk.searchOrders(value);
    setSearchResults(results);
  }, []);

  const handleSearchSelect = async (order: OrderProjection) => {
    const result = await window.kiosk.redeemOrder(order.oid);
    setScreen(result.state);
    setSearchOpen(false);
    setSearchResults([]);
    setSearchTerm("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void performSearch(searchTerm);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [performSearch, searchOpen, searchTerm]);

  const renderContent = () => {
    switch (screen.type) {
      case "green":
        return (
          <div className="main-card">
            <h1>Welcome, {screen.name}!</h1>
            <p>Order ID: {screen.oid}</p>
            <div className="item-list">
              {screen.items.map((item) => (
                <span key={item.name}>
                  {item.name} × {item.quantity}
                </span>
              ))}
            </div>
            <p>Backup code: {screen.humanCode}</p>
          </div>
        );
      case "yellow":
        return (
          <div className="main-card">
            <h2>Already redeemed</h2>
            <p>{screen.name}</p>
            <p>First scanned at {new Date(screen.firstRedeemedAt).toLocaleTimeString()}</p>
            <p>Station: {screen.stationId}</p>
            <div className="item-list">
              {screen.items.map((item) => (
                <span key={item.name}>
                  {item.name} × {item.quantity}
                </span>
              ))}
            </div>
            <p className="override-hint">Press F9 to override</p>
          </div>
        );
      case "red":
        return (
          <div className="main-card">
            <h2>Hold up</h2>
            <p>{screen.message}</p>
          </div>
        );
      default:
        return (
          <div className="main-card">
            <h1>Scan QR now</h1>
            <p>Have guests show their phone to the scanner.</p>
            <p className="instructions">Need help? Press F2 to search by name or code.</p>
          </div>
        );
    }
  };

  return (
    <div className={`app app--${screen.type}`}>
      <header className="status-bar">
        <div className="status-bar__left">
          <span className={statusDotClass} />
          <span>{summary?.online ? "Online" : "Offline"}</span>
          <span>{lastSyncLabel}</span>
          {summary && summary.outboxCount > 0 ? <span>Outbox: {summary.outboxCount}</span> : null}
        </div>
        <div className="status-bar__right">
          <span>F2 Search</span>
          <span>F5 Sync</span>
          <span>F9 Override</span>
        </div>
      </header>

      {renderContent()}

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="hidden-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          name="scan"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
        />
      </form>

      {syncFeedback ? <div className="sync-feedback">{syncFeedback}</div> : null}

      {searchOpen ? (
        <div className="search-overlay" role="dialog" aria-modal="true">
          <div className="search-box">
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void performSearch(event.currentTarget.value);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setSearchOpen(false);
                }
              }}
              placeholder="Search by name, order ID, or backup code"
            />
          </div>
          <div className="search-results">
            {searchResults.length === 0 && searchTerm ? (
              <div className="search-empty">No matches. Try another search.</div>
            ) : null}
            {searchResults.map((order) => (
              <button
                key={order.oid}
                type="button"
                className="search-result"
                onClick={() => void handleSearchSelect(order)}
              >
                <span>
                  {order.n} — {order.oid}
                </span>
                <span>{order.jti}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
