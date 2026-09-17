import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

function money(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format((Number(cents) || 0) / 100);
}

function monthLabel(key) {
  if (!/^\d{4}-\d{2}$/.test(key || '')) return key;
  return new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function dateLabel(value) {
  if (!value) return 'Date needed';
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function sourceLabel(row) {
  return String(row.sourceSystem || row.provider || 'planner').replaceAll('_', ' ');
}

function Metric({ label, value, tone = 'neutral', detail }) {
  return (
    <div className={`planner-cash-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function ActionList({ title, description, rows, empty, amountKey = 'amountCents' }) {
  return (
    <section className="planner-cash-section">
      <div className="planner-cash-section-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{rows.length}</span>
      </div>
      {rows.length ? (
        <div className="planner-cash-actions">
          {rows.map((row) => (
            <article key={row.id} className="planner-cash-action">
              <div>
                <strong>{row.title}</strong>
                <p>
                  {dateLabel(row.dueDate || row.date || row.serviceDate)}
                  {row.customerName ? ` · ${row.customerName}` : ''}
                  {row.counterpartyName ? ` · ${row.counterpartyName}` : ''}
                </p>
              </div>
              <div className="planner-cash-action-value">
                <strong>{money(row[amountKey])}</strong>
                <span className={`planner-provenance-chip is-${row.urgency || 'source'}`}>
                  {row.urgency ? row.urgency.replaceAll('_', ' ') : sourceLabel(row)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="planner-cash-empty">{empty}</p>
      )}
    </section>
  );
}

export function CashflowView({ accessToken, year }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const load = useCallback(
    async (signal) => {
      if (!accessToken) return;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/planner/ledger?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || `Cashflow request failed (${response.status})`);
        setLedger(data);
      } catch (requestError) {
        if (requestError.name !== 'AbortError')
          setError(requestError.message || 'Cashflow could not be loaded');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, from, to]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  const evidenceRows = useMemo(
    () => [...(ledger?.reportedUndatedCash || []), ...(ledger?.reportedUndatedCostPayments || [])],
    [ledger]
  );

  if (!accessToken) {
    return (
      <div className="planner-cash-empty-state">
        Sign in as an administrator to view operational cashflow.
      </div>
    );
  }

  return (
    <div className="planner-cashflow">
      <header className="planner-cashflow-header">
        <div>
          <span className="planner-kicker">Commercial ledger · {year}</span>
          <h2>Booked work, obligations, and actual cash</h2>
          <p>
            Service dates drive revenue. Due dates drive receivables and payables. Payment dates
            drive cash.
          </p>
        </div>
        <button
          type="button"
          className="planner-button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Reconciling…' : 'Reconcile'}
        </button>
      </header>

      {error && (
        <div className="planner-cash-alert is-error" role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {ledger?.projection?.errors?.length > 0 && (
        <div className="planner-cash-alert" role="alert">
          <AlertTriangle size={16} />
          {ledger.projection.errors.length} source record
          {ledger.projection.errors.length === 1 ? '' : 's'} need reconciliation.
        </div>
      )}

      <div className="planner-cash-metrics" aria-label="Cashflow totals">
        <Metric
          label="Booked revenue"
          value={ledger?.totals?.bookedRevenueCents}
          tone="ink"
          detail="by service date"
        />
        <Metric
          label="Open receivables"
          value={ledger?.totals?.receivablesCents}
          tone="incoming"
          detail="issued and still owed"
        />
        <Metric
          label="Cash received"
          value={ledger?.totals?.cashInCents}
          tone="cash"
          detail="dated payment evidence"
        />
        <Metric
          label="Committed costs"
          value={ledger?.totals?.committedCostsCents}
          tone="cost"
          detail="accepted obligations"
        />
        <Metric
          label="Open payables"
          value={ledger?.totals?.payablesCents}
          tone="outgoing"
          detail="committed and unpaid"
        />
        <Metric
          label="Cash paid"
          value={ledger?.totals?.cashOutCents}
          tone="paid"
          detail="dated payment evidence"
        />
      </div>

      <section className="planner-cash-timeline">
        <div className="planner-cash-section-heading">
          <div>
            <h3>Month-by-month lanes</h3>
            <p>Commercial activity stays separate from actual cash movement.</p>
          </div>
        </div>
        <div className="planner-cash-table-wrap">
          <table className="planner-cash-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Booked</th>
                <th>Cash in</th>
                <th>Receivable due</th>
                <th>Committed cost</th>
                <th>Cash out</th>
                <th>Payable due</th>
              </tr>
            </thead>
            <tbody>
              {(ledger?.months || []).map((month) => (
                <tr key={month.month}>
                  <th>{monthLabel(month.month)}</th>
                  <td>{money(month.bookedRevenueCents)}</td>
                  <td className="is-positive">
                    <ArrowDownToLine size={12} />
                    {money(month.cashInCents)}
                  </td>
                  <td>{money(month.receivablesDueCents)}</td>
                  <td>{money(month.committedCostsCents)}</td>
                  <td className="is-negative">
                    <ArrowUpFromLine size={12} />
                    {money(month.cashOutCents)}
                  </td>
                  <td>{money(month.payablesDueCents)}</td>
                </tr>
              ))}
              {!loading && !(ledger?.months || []).length && (
                <tr>
                  <td colSpan="7" className="planner-cash-empty">
                    No dated ledger activity in {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="planner-cash-grid">
        <ActionList
          title="Collect"
          description="Issued balances ordered by due date."
          rows={ledger?.receivables || []}
          amountKey="amountCents"
          empty="No open receivables in this range."
        />
        <ActionList
          title="Pay"
          description="Committed costs that still need payment."
          rows={ledger?.payables || []}
          amountKey="outstandingCents"
          empty="No open payables in this range."
        />
        <ActionList
          title="Evidence needed"
          description="Amounts reported without a payment date cannot enter cashflow."
          rows={evidenceRows}
          empty="Every reported payment has dated provenance."
        />
        <ActionList
          title="Recurring billing"
          description="One occurrence per expected billing date; no multiplied template cards."
          rows={ledger?.recurringBilling || []}
          empty="No active recurring billing occurrences in this range."
        />
      </div>

      {!loading &&
        ledger &&
        !ledger.receivables.length &&
        !ledger.payables.length &&
        !evidenceRows.length && (
          <div className="planner-cash-complete">
            <CheckCircle2 size={18} />
            Commercial follow-up is clear for this range.
          </div>
        )}
    </div>
  );
}
