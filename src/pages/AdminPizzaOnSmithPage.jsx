import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { API_BASE } from '../lib/apiBase';

async function apiFetch(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : '');
    const code = data?.code || data?.error?.code || (data?.message && typeof data?.error === 'string' ? data.error : '');
    const error = new Error(`${detail || `Request failed (${response.status})`}${code && code !== detail ? ` (${code})` : ''}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const money = (cents, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
const dateTime = (value) => value ? new Date(value).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }) : 'Not specified';
const METHOD_LABEL = { pickup: 'Pickup', delivery: 'Metro delivery', shipping: 'Shipping' };
const DROP_LABEL = { open: 'Ordering is open', upcoming: 'Drop has not opened', closed: 'Ordering is closed' };
const ACTION_LABEL = { pickup: 'Mark ready for pickup & email', delivery: 'Mark out for delivery & email', shipping: 'Mark shipped & email' };
const NEEDS_RETRY = new Set(['retry', 'dead_letter']);

function confirmationErrorMessage(error) {
  if (error.status === 404 || error.status === 405) {
    return `${error.message}. Sale confirmation controls may not be available on this API deployment, or this order is unavailable.`;
  }
  return error.message || 'Could not access sale confirmations.';
}

function OrderConfirmations({ orderId, accessToken, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [confirmations, setConfirmations] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestActive = useRef(false);
  const path = `/api/sales/pizza-on-smith/orders/${encodeURIComponent(orderId)}/confirmations`;
  const canRequest = isAdmin && Boolean(accessToken);

  const readConfirmations = async () => {
    const data = await apiFetch(path, accessToken);
    if (!Array.isArray(data.confirmations)) throw new Error('The API did not return confirmation details. The matching API deployment may be required.');
    setConfirmations(data.confirmations);
    return data.confirmations;
  };

  const viewConfirmations = async () => {
    if (!canRequest || requestActive.current) return;
    setOpen(true);
    requestActive.current = true;
    setBusy('preview');
    setError('');
    setMessage('');
    try {
      await readConfirmations();
    } catch (err) {
      setError(confirmationErrorMessage(err));
    } finally {
      requestActive.current = false;
      setBusy('');
    }
  };

  const sendConfirmation = async (confirmation) => {
    if (!canRequest || requestActive.current || ['sent', 'processing'].includes(confirmation.status)) return;
    const destinations = ['to', 'cc', 'bcc'].flatMap((field) => (confirmation[field] || []).map(({ email, name }) =>
      `${field.toUpperCase()}: ${name ? `${name} <${email}>` : email}`)).join(', ');
    if (!destinations || !window.confirm(`Send the original ${confirmation.role} sale confirmation to ${destinations}?\n\nThis sends an email. It does not mark the order ready.`)) return;
    requestActive.current = true;
    setBusy(confirmation.role);
    setError('');
    setMessage('');
    let sendError = '';
    let latest = null;
    try {
      const data = await apiFetch(`${path}/send`, accessToken, { method: 'POST', body: JSON.stringify({ role: confirmation.role }) });
      if (Array.isArray(data.confirmations)) {
        latest = data.confirmations;
        setConfirmations(latest);
      }
    } catch (err) {
      sendError = confirmationErrorMessage(err);
    }
    try {
      latest = await readConfirmations();
    } catch (err) {
      sendError = `${sendError ? `${sendError} ` : ''}Could not refresh persisted confirmation status: ${confirmationErrorMessage(err)} Review the status before trying again.`;
    } finally {
      requestActive.current = false;
      setBusy('');
    }
    const selected = latest?.find(({ role }) => role === confirmation.role);
    if (sendError) {
      setError(sendError);
    } else if (selected?.status === 'sent') {
      setMessage(`The email provider accepted the ${confirmation.role} confirmation. Recipient delivery is not confirmed.`);
    } else {
      setError(`The ${confirmation.role} confirmation is ${selected?.status || 'not confirmed as accepted'}.${selected?.lastError ? ` ${selected.lastError}` : ' Review the persisted status and retry when appropriate.'}`);
    }
  };

  return <div className="space-y-3">
    <Button type="button" size="sm" variant="outline" disabled={!canRequest || Boolean(busy)} aria-expanded={open} aria-controls={`confirmations-${orderId}`} onClick={() => open ? setOpen(false) : void viewConfirmations()}>
      {open ? 'Hide confirmations' : 'View confirmations'}
    </Button>
    {open && <section id={`confirmations-${orderId}`} className="space-y-3 border-t pt-3" aria-label="Sale confirmations" aria-busy={Boolean(busy)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Sale confirmations</h4>
        <Button type="button" size="sm" variant="outline" disabled={!canRequest || Boolean(busy)} onClick={() => void viewConfirmations()}>Refresh confirmation status</Button>
      </div>
      <p className="text-sm text-slate-600">Original saved messages, separate from ready emails. Sending does not change fulfillment status. Sent means accepted by the email provider, not confirmed recipient delivery.</p>
      {busy === 'preview' && <p role="status" className="text-sm text-slate-500">Loading confirmations…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      {confirmations && ['customer', 'owner'].map((role) => {
        const confirmation = confirmations.find((entry) => entry.role === role);
        const status = confirmation?.status || 'missing';
        const hasSnapshot = confirmation?.to?.some(({ email }) => email) && confirmation.subject && confirmation.textContent;
        return <section key={role} className="space-y-2 rounded-lg border p-3" aria-label={`${role === 'customer' ? 'Customer' : 'Owner'} sale confirmation`}>
          <h5 className="font-semibold">{role === 'customer' ? 'Customer' : 'Owner'} confirmation</h5>
          <p className="break-words text-sm"><strong>To:</strong> {confirmation?.to?.map(({ email, name }) => name ? `${name} <${email}>` : email).join(', ') || 'No saved recipient'}</p>
          {['cc', 'bcc'].map((field) => confirmation?.[field]?.length > 0 && <p key={field} className="break-words text-sm"><strong>{field.toUpperCase()}:</strong> {confirmation[field].map(({ email, name }) => name ? `${name} <${email}>` : email).join(', ')}</p>)}
          <p className="break-words text-sm"><strong>Subject:</strong> {confirmation?.subject || 'No saved subject'}</p>
          <p className="text-sm"><strong>Status:</strong> {status} · Attempts: {confirmation?.attempts ?? 0}</p>
          {confirmation?.lastError && <p className="break-words text-sm text-red-700"><strong>Last error:</strong> {confirmation.lastError}</p>}
          {confirmation?.sentAt && <p className="text-sm"><strong>Provider accepted at:</strong> {dateTime(confirmation.sentAt)} (Central)</p>}
          {confirmation?.providerMessageId && <p className="break-words text-sm"><strong>Provider message ID:</strong> {confirmation.providerMessageId}</p>}
          <p className="text-sm font-semibold">Original message</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm">{confirmation?.textContent || 'No original message snapshot available.'}</pre>
          {!hasSnapshot && <p className="text-sm text-slate-600">Sending is unavailable without the saved recipient, subject, and original message.</p>}
          <Button type="button" size="sm" variant="outline" disabled={!canRequest || Boolean(busy) || !hasSnapshot || ['sent', 'processing'].includes(status)} onClick={() => void sendConfirmation(confirmation)}>
            {busy === role ? 'Sending…' : status === 'sent' ? 'Already accepted by provider' : status === 'processing' ? 'Processing' : `${NEEDS_RETRY.has(status) ? 'Retry' : 'Send'} ${role} confirmation`}
          </Button>
        </section>;
      })}
    </section>}
  </div>;
}

export default function AdminPizzaOnSmithPage() {
  const { user, isAdmin, accessToken, loading: authLoading, signInWithGoogle, signOut } = useSupabaseAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyOrder, setBusyOrder] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('todo');
  const [tracking, setTracking] = useState({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setReport(await apiFetch('/api/sales/pizza-on-smith/report', accessToken));
    } catch (err) {
      setError(err.message || 'Could not load Pizza on Smith sales');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAdmin && accessToken) void load();
  }, [isAdmin, accessToken, load]);

  const markReady = async (order) => {
    const trackingNumber = (tracking[order.id]?.number || '').trim();
    if (order.method === 'shipping' && !order.ready && !trackingNumber) {
      setError('Enter the tracking number before marking this order shipped.');
      return;
    }
    setBusyOrder(order.id);
    setError('');
    setMessage('');
    try {
      const body = order.method === 'shipping' ? { trackingNumber: trackingNumber || order.readyEmail?.trackingNumber, carrier: tracking[order.id]?.carrier || order.readyEmail?.carrier } : {};
      const result = await apiFetch(`/api/sales/pizza-on-smith/orders/${encodeURIComponent(order.id)}/ready`, accessToken, { method: 'POST', body: JSON.stringify(body) });
      setMessage(result.status === 'sent'
        ? `Email sent to ${order.customer.email}.`
        : result.status === 'dead_letter'
          ? 'The email could not be delivered (address bounced or suppressed). Contact the customer directly.'
          : 'The email did not go out yet. It is saved and will retry; press Retry email to try again now.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not queue the customer email');
    } finally {
      setBusyOrder('');
    }
  };

  const shell = (children) => <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900"><div className="mx-auto w-full max-w-5xl space-y-5">{children}</div></main>;
  if (authLoading) return shell(<p className="rounded-lg bg-white p-4">Checking access…</p>);
  if (!user) return shell(<section className="rounded-lg bg-white p-5"><h1 className="text-xl font-semibold">Pizza on Smith sales</h1><p className="my-2 text-sm text-slate-600">Sign in with an admin account.</p><Button onClick={() => signInWithGoogle(`${window.location.origin}/admin/pizza-on-smith`)}>Sign in with Google</Button></section>);
  if (!isAdmin) return shell(<section className="rounded-lg bg-white p-5"><p className="font-semibold">Admin access required</p><Button className="mt-3" variant="outline" onClick={signOut}>Sign out</Button></section>);

  return shell(<>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Pizza on Smith orders</h1><p className="text-sm text-slate-600">Paid orders and fulfillment status. Ready emails are sent through the durable email queue.</p></div>
      <Button variant="outline" disabled={loading || Boolean(busyOrder)} onClick={() => void load()}>Refresh</Button>
    </header>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading && <p className="text-sm text-slate-500">Loading sales…</p>}
    {report && <>
      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-semibold">{DROP_LABEL[report.drop?.status] || 'Drop status unknown'}</p>
          <p className="text-sm text-slate-600">{report.drop?.opensAt ? `${dateTime(report.drop.opensAt)} to ${dateTime(report.drop.closesAt)} (Central)` : 'No ordering window set in Sanity'}{report.drop?.fulfillmentLabel ? ` · Fulfillment: ${report.drop.fulfillmentLabel}` : ''}</p>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Gross paid sales</p><p className="text-2xl font-semibold">{money(report.totals.grossSalesCents)}</p></article>
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Paid orders</p><p className="text-2xl font-semibold">{report.totals.orderCount}</p></article>
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Units sold</p><p className="text-2xl font-semibold">{report.totals.units}</p></article>
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Orders ready / shipped</p><p className="text-2xl font-semibold">{report.totals.readyCount} of {report.totals.orderCount}</p></article>
      </section>
      <section className="overflow-x-auto rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Pick list</h2>
        <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Product</th><th className="p-2">Units</th>{Object.keys(METHOD_LABEL).map((method) => <th className="p-2" key={method}>{METHOD_LABEL[method]}</th>)}<th className="p-2">Sales</th></tr></thead>
          <tbody>{report.products.map((product) => <tr className="border-b last:border-0" key={product.name}><td className="p-2">{product.name}</td><td className="p-2 font-semibold">{product.units}</td>{Object.keys(METHOD_LABEL).map((method) => <td className="p-2" key={method}>{product.byMethod?.[method] || 0}</td>)}<td className="p-2">{money(product.grossSalesCents)}</td></tr>)}</tbody>
        </table>
        <p className="mt-3 text-sm text-slate-600">{report.byMethod.map((entry) => `${METHOD_LABEL[entry.method] || entry.method}: ${entry.orderCount} orders (${entry.readyCount} done)`).join(' · ') || 'No orders yet.'}</p>
      </section>
      <section className="overflow-x-auto rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Daily paid sales (Central time)</h2>
        <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Date</th><th className="p-2">Gross sales</th><th className="p-2">Orders</th><th className="p-2">Units</th></tr></thead>
          <tbody>{report.daily.map((day) => <tr className="border-b last:border-0" key={day.date}><td className="p-2">{day.date}</td><td className="p-2">{money(day.grossSalesCents)}</td><td className="p-2">{day.orderCount}</td><td className="p-2">{day.units}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Paid orders</h2>
          <div className="flex gap-2" role="group" aria-label="Order filter">{[['todo', 'To do'], ['ready', 'Done'], ['all', 'All']].map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{label}</Button>)}</div></div>
        {report.orders.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-600">No paid Pizza on Smith orders yet.</p>}
        {report.orders.filter((order) => filter === 'all' || (filter === 'ready' ? order.ready : !order.ready)).map((order) => <article key={order.id} className="space-y-3 rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{order.customer.name || 'Customer'} · {money(order.totalCents, order.currency)} · {METHOD_LABEL[order.method] || order.method}</h3><p className="text-sm text-slate-600">{order.customer.email || 'No email'}{order.customer.phone ? ` · ${order.customer.phone}${order.customer.smsReleaseOptIn ? ' (OK to text)' : ' (no text consent)'}` : ''} · Ref {order.reference}</p><p className="text-xs text-slate-500">Placed {dateTime(order.createdAt)}</p></div>
            <div className="flex flex-col items-end gap-2">
              {order.ready && <span className={`rounded-full px-3 py-1 text-sm ${NEEDS_RETRY.has(order.readyEmail?.status) ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>{ACTION_LABEL[order.method]?.split(' &')[0] || 'Done'} · Email {order.readyEmail?.status || 'queued'}</span>}
              {order.method === 'shipping' && !order.ready && <div className="flex gap-2"><input aria-label="Carrier" className="w-24 rounded border px-2 py-1 text-sm" placeholder="Carrier" value={tracking[order.id]?.carrier || ''} onChange={(event) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], carrier: event.target.value } }))} /><input aria-label="Tracking number" className="w-40 rounded border px-2 py-1 text-sm" placeholder="Tracking number" value={tracking[order.id]?.number || ''} onChange={(event) => setTracking((prev) => ({ ...prev, [order.id]: { ...prev[order.id], number: event.target.value } }))} /></div>}
              {(!order.ready || order.readyEmail?.status !== 'sent') && <Button disabled={Boolean(busyOrder)} onClick={() => void markReady(order)}>{busyOrder === order.id ? 'Sending…' : order.ready ? 'Retry email' : ACTION_LABEL[order.method] || ACTION_LABEL.pickup}</Button>}
            </div></div>
          <ul className="list-inside list-disc text-sm">{order.lines.map((line) => <li key={line.id}>{line.quantity} × {line.name} — {money(line.totalCents, order.currency)}</li>)}</ul>
          {Object.entries(order.fulfillmentDetails || {}).filter(([, value]) => value).map(([label, value]) => <p className="whitespace-pre-line text-sm text-slate-600" key={label}><strong>{label}:</strong> {value}</p>)}
          <OrderConfirmations orderId={order.id} accessToken={accessToken} isAdmin={isAdmin} />
        </article>)}
      </section>
    </>}
  </>);
}
