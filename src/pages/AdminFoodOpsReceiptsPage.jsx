import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { API_BASE } from '../lib/apiBase';
import { cn } from '../lib/utils';

const SOURCES = [
  { value: 'receipt_wedge', label: 'Wedge' },
  { value: 'receipt_eastside', label: 'Eastside' },
  { value: 'vendor_invoice', label: 'Vendor invoices' },
];

const SCOPE_FILTERS = [
  { value: 'unassigned', label: 'Needs a decision' },
  { value: 'business', label: 'Has business lines' },
  { value: 'personal', label: 'Has personal lines' },
  { value: 'all', label: 'Everything' },
];

const SCOPE_STYLES = {
  business: { active: 'bg-emerald-600 text-white border-emerald-600', idle: 'border-emerald-300 text-emerald-800 bg-white', chip: 'bg-emerald-100 text-emerald-800' },
  personal: { active: 'bg-violet-600 text-white border-violet-600', idle: 'border-violet-300 text-violet-800 bg-white', chip: 'bg-violet-100 text-violet-800' },
};

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

async function foodOpsFetch(path, accessToken, options = {}) {
  const response = await fetch(`${API_BASE}/api/food-ops${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

const post = (path, accessToken, body) => foodOpsFetch(path, accessToken, { method: 'POST', body: JSON.stringify(body) });

// Keep the window totals in step with a receipt that just changed, without refetching the list.
function swapReceipt(data, next) {
  const index = data.receipts.findIndex((row) => row.source === next.source && row.receiptKey === next.receiptKey);
  if (index < 0) return data;
  const previous = data.receipts[index];
  const totals = { ...data.totals };
  totals.assignedLines += next.counts.business + next.counts.personal - (previous.counts.business + previous.counts.personal);
  totals.unassignedLines += next.counts.unassigned - previous.counts.unassigned;
  totals.businessCents += next.cents.business - previous.cents.business;
  totals.personalCents += next.cents.personal - previous.cents.personal;
  totals.unassignedCents += next.cents.unassigned - previous.cents.unassigned;
  totals.suggestions += next.suggestionCount - previous.suggestionCount;
  const receipts = data.receipts.slice();
  receipts[index] = next;
  return { ...data, receipts, totals };
}

function ScopeButton({ scope, active, onClick, disabled, children, className }) {
  const styles = SCOPE_STYLES[scope];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-lg border-2 font-semibold transition-colors disabled:opacity-50',
        active ? styles.active : styles.idle,
        className,
      )}
    >
      {children}
    </button>
  );
}

function ScopeChip({ line }) {
  if (line.scope) {
    const label = line.scopeOrigin === 'default' ? `always ${line.scope}` : line.scopeOrigin === 'suggestion' ? `${line.scope} (accepted)` : line.scope;
    return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', SCOPE_STYLES[line.scope].chip)}>{label}</span>;
  }
  if (line.suggestion) {
    return (
      <span className="rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-xs text-slate-600">
        suggest {line.suggestion.scope} · {line.suggestion.evidence}×
      </span>
    );
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">unassigned</span>;
}

function LineRow({ line, split, busy, onLineScope, onDefaultScope }) {
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-900 break-words">{line.description || 'Unknown item'}</div>
          <div className="mt-1"><ScopeChip line={line} /></div>
        </div>
        <div className="shrink-0 text-sm font-medium tabular-nums text-slate-900">{money(line.lineTotalCents)}</div>
      </div>
      {split ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {['business', 'personal'].map((scope) => (
              <ScopeButton
                key={scope}
                scope={scope}
                active={line.scope === scope && line.scopeOrigin !== 'default'}
                disabled={busy}
                className="h-11 text-sm capitalize"
                onClick={() => onLineScope(line, line.scope === scope && line.scopeOrigin !== 'default' ? null : scope)}
              >
                {scope}
              </ScopeButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {line.defaultScope ? (
              <>
                <span>Rule: always {line.defaultScope}</span>
                <button type="button" disabled={busy} className="underline disabled:opacity-50" onClick={() => onDefaultScope(line, null)}>remove rule</button>
              </>
            ) : (
              ['business', 'personal'].map((scope) => (
                <button key={scope} type="button" disabled={busy} className="underline disabled:opacity-50" onClick={() => onDefaultScope(line, scope)}>
                  always {scope} for this item
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function ReceiptCard({ receipt, busy, onReceiptScope, onLineScope, onDefaultScope, onAccept }) {
  const [split, setSplit] = useState(false);
  const allScope = receipt.status === 'business' || receipt.status === 'personal' ? receipt.status : null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle className="text-base">{receipt.vendor || 'Unknown store'}</CardTitle>
          <div className="text-lg font-semibold tabular-nums">{money(receipt.totalCents)}</div>
        </div>
        <CardDescription>
          {receipt.date} · {receipt.lineCount} line{receipt.lineCount === 1 ? '' : 's'}
          {receipt.status === 'mixed' ? ' · split' : receipt.status === 'partial' ? ' · partly assigned' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {['business', 'personal'].map((scope) => (
            <ScopeButton
              key={scope}
              scope={scope}
              active={allScope === scope}
              disabled={busy}
              className="h-14 text-base capitalize"
              onClick={() => onReceiptScope(receipt, scope)}
            >
              {scope}
            </ScopeButton>
          ))}
        </div>
        {receipt.suggestionCount > 0 ? (
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => onAccept(receipt)}>
            Accept {receipt.suggestionCount} suggestion{receipt.suggestionCount === 1 ? '' : 's'}
          </Button>
        ) : null}
        <ul className="divide-y divide-slate-100">
          {receipt.lines.map((line) => (
            <LineRow key={line.observationId} line={line} split={split} busy={busy} onLineScope={onLineScope} onDefaultScope={onDefaultScope} />
          ))}
        </ul>
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="font-medium text-slate-700 underline" onClick={() => setSplit((value) => !value)}>
            {split ? 'Hide split by line' : 'Split by line'}
          </button>
          {receipt.counts.business + receipt.counts.personal > 0 ? (
            <button type="button" disabled={busy} className="text-slate-500 underline disabled:opacity-50" onClick={() => onReceiptScope(receipt, null)}>
              clear decisions
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressSummary({ totals, busy, onAcceptAll }) {
  const assigned = totals.assignedLines;
  const total = totals.lines;
  const pct = total ? Math.round((assigned / total) * 100) : 0;
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-slate-900">{assigned} of {total} lines assigned</span>
          <span className="text-slate-500">{totals.receipts} receipts</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="font-semibold text-emerald-700 tabular-nums">{money(totals.businessCents)}</div><div className="text-xs text-slate-500">business</div></div>
          <div><div className="font-semibold text-violet-700 tabular-nums">{money(totals.personalCents)}</div><div className="text-xs text-slate-500">personal</div></div>
          <div><div className="font-semibold text-amber-700 tabular-nums">{money(totals.unassignedCents)}</div><div className="text-xs text-slate-500">unassigned</div></div>
        </div>
        {totals.suggestions > 0 ? (
          <Button className="w-full" disabled={busy} onClick={onAcceptAll}>
            Accept all {totals.suggestions} suggestions
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

const AdminFoodOpsReceiptsPage = () => {
  const { user, isAdmin, accessToken, loading: authLoading, signInWithGoogle, signOut } = useSupabaseAuth();
  const [filters, setFilters] = useState({ source: 'receipt_wedge', scope: 'unassigned', from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({ source: filters.source, scope: filters.scope });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setData(await foodOpsFetch(`/receipts?${query}`, accessToken));
    } catch (err) {
      setError(err.message || 'Could not load receipts');
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);

  useEffect(() => {
    if (isAdmin && accessToken) void load();
  }, [accessToken, isAdmin, load]);

  const act = useCallback(async (work) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }, []);

  const replaceReceipt = (receipt) => setData((current) => (current ? swapReceipt(current, receipt) : current));

  const onReceiptScope = (receipt, scope) => act(async () => {
    const result = await post('/receipts/scope', accessToken, { source: receipt.source, receiptKey: receipt.receiptKey, scope });
    replaceReceipt(result.receipt);
    if (result.result.heldByDefault > 0) setMessage(`${result.result.heldByDefault} line(s) follow their "always" rule`);
  });

  const onLineScope = (receipt) => (line, scope) => act(async () => {
    const result = await post('/receipts/scope', accessToken, {
      source: receipt.source,
      receiptKey: receipt.receiptKey,
      lines: [{ observationId: line.observationId, scope }],
    });
    replaceReceipt(result.receipt);
  });

  const onDefaultScope = (receipt) => (line, scope) => act(async () => {
    await post(`/vendor-items/${encodeURIComponent(line.vendorItemId)}/default-scope`, accessToken, { scope });
    await load();
    setMessage(scope ? `Rule saved: always ${scope}` : 'Rule removed');
  });

  const onAccept = (receipt) => act(async () => {
    const result = await post('/receipts/accept-suggestions', accessToken, { source: receipt.source, receiptKey: receipt.receiptKey });
    if (result.receipt) replaceReceipt(result.receipt);
    setMessage(`${result.result.accepted} suggestion(s) accepted`);
  });

  const onAcceptAll = () => act(async () => {
    const body = { source: filters.source, ...(filters.from ? { from: filters.from } : {}), ...(filters.to ? { to: filters.to } : {}) };
    const result = await post('/receipts/accept-suggestions', accessToken, body);
    await load();
    setMessage(`${result.result.accepted} suggestion(s) accepted`);
  });

  const shell = (children) => (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900">
      <div className="mx-auto w-full max-w-xl space-y-4">{children}</div>
    </div>
  );

  if (authLoading) {
    return shell(<Card><CardHeader><CardTitle>Checking access…</CardTitle></CardHeader></Card>);
  }

  if (!user) {
    return shell(
      <Card>
        <CardHeader>
          <CardTitle>Receipt scope</CardTitle>
          <CardDescription>Sign in with an admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => signInWithGoogle(`${window.location.origin}/admin/food-ops/receipts`)}>Sign in with Google</Button>
        </CardContent>
      </Card>,
    );
  }

  if (!isAdmin) {
    return shell(
      <Card>
        <CardHeader>
          <CardTitle>Admin access required</CardTitle>
        </CardHeader>
        <CardContent><Button variant="outline" onClick={signOut}>Sign out</Button></CardContent>
      </Card>,
    );
  }

  return shell(
    <>
      <header>
        <h1 className="text-xl font-semibold">Personal or business?</h1>
        <p className="text-sm text-slate-600">Tap one for the whole receipt, or split by line. Prices count toward unit costs either way.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-slate-500">Store</span>
          <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-2" value={filters.source} onChange={(event) => setFilters((c) => ({ ...c, source: event.target.value }))}>
            {SOURCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">Show</span>
          <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-2" value={filters.scope} onChange={(event) => setFilters((c) => ({ ...c, scope: event.target.value }))}>
            {SCOPE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">From</span>
          <input type="date" className="h-10 w-full rounded-md border border-slate-300 bg-white px-2" value={filters.from} onChange={(event) => setFilters((c) => ({ ...c, from: event.target.value }))} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">To</span>
          <input type="date" className="h-10 w-full rounded-md border border-slate-300 bg-white px-2" value={filters.to} onChange={(event) => setFilters((c) => ({ ...c, to: event.target.value }))} />
        </label>
      </div>

      {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}

      {data ? <ProgressSummary totals={data.totals} busy={busy} onAcceptAll={onAcceptAll} /> : null}

      {loading && !data ? <p className="text-sm text-slate-500">Loading receipts…</p> : null}
      {data && data.receipts.length === 0 ? <p className="text-sm text-slate-500">Nothing to show for this filter.</p> : null}
      {data?.truncated ? <p className="text-sm text-amber-700">Very large window: narrow the dates to see everything.</p> : null}

      {data?.receipts.map((receipt) => (
        <ReceiptCard
          key={`${receipt.source}:${receipt.receiptKey}`}
          receipt={receipt}
          busy={busy}
          onReceiptScope={onReceiptScope}
          onLineScope={onLineScope(receipt)}
          onDefaultScope={onDefaultScope(receipt)}
          onAccept={onAccept}
        />
      ))}
      {data && data.matched > data.receipts.length ? (
        <p className="text-center text-sm text-slate-500">Showing {data.receipts.length} of {data.matched}. Narrow the dates for the rest.</p>
      ) : null}

      <div className="flex justify-between pb-6">
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>Refresh</Button>
        <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
      </div>
    </>,
  );
};

export default AdminFoodOpsReceiptsPage;
