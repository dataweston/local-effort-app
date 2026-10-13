import React, { useCallback, useEffect, useState } from 'react';
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
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

const money = (cents, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
const dateTime = (value) => value ? new Date(value).toLocaleString() : 'Not specified';

export default function AdminPizzaOnSmithPage() {
  const { user, isAdmin, accessToken, loading: authLoading, signInWithGoogle, signOut } = useSupabaseAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyOrder, setBusyOrder] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
    setBusyOrder(order.id);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch(`/api/sales/pizza-on-smith/orders/${encodeURIComponent(order.id)}/ready`, accessToken, { method: 'POST', body: '{}' });
      setMessage(result.delivery?.sent ? 'Ready email sent.' : 'Ready email is durably queued; delivery will retry if needed.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not queue ready email');
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
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Gross paid sales</p><p className="text-2xl font-semibold">{money(report.totals.grossSalesCents)}</p></article>
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Paid orders</p><p className="text-2xl font-semibold">{report.totals.orderCount}</p></article>
        <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Units sold</p><p className="text-2xl font-semibold">{report.totals.units}</p></article>
      </section>
      <section className="overflow-x-auto rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Daily paid sales</h2>
        <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Date</th><th className="p-2">Gross sales</th><th className="p-2">Orders</th><th className="p-2">Units</th></tr></thead>
          <tbody>{report.daily.map((day) => <tr className="border-b last:border-0" key={day.date}><td className="p-2">{day.date}</td><td className="p-2">{money(day.grossSalesCents)}</td><td className="p-2">{day.orderCount}</td><td className="p-2">{day.units}</td></tr>)}</tbody>
        </table>
        <h3 className="mb-2 mt-5 font-semibold">By product</h3>
        <div className="space-y-1 text-sm">{report.products.map((product) => <p key={product.name}>{product.name}: {product.units} units · {product.orderCount} line-orders · {money(product.grossSalesCents)}</p>)}</div>
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Paid orders</h2>
        {report.orders.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-600">No paid Pizza on Smith orders yet.</p>}
        {report.orders.map((order) => <article key={order.id} className="space-y-3 rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{order.customer.name || 'Customer'} · {money(order.totalCents, order.currency)}</h3><p className="text-sm text-slate-600">{order.customer.email || 'No email'} · Ref {order.reference}</p><p className="text-xs text-slate-500">Placed {dateTime(order.createdAt)} · Fulfillment date {dateTime(order.fulfillmentDate)}</p></div>
            {order.ready ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">Ready · Email {order.readyEmail?.status || 'queued'}</span> : <Button disabled={Boolean(busyOrder)} onClick={() => void markReady(order)}>{busyOrder === order.id ? 'Queuing…' : 'Mark ready & email customer'}</Button>}</div>
          <p className="text-sm"><strong>Fulfillment:</strong> {order.fulfillment || 'Not specified'}</p>
          <ul className="list-inside list-disc text-sm">{order.lines.map((line) => <li key={line.id}>{line.quantity} × {line.name} — {money(line.totalCents, order.currency)}</li>)}</ul>
          {Object.entries(order.fulfillmentDetails || {}).filter(([, value]) => value).map(([label, value]) => <p className="whitespace-pre-line text-sm text-slate-600" key={label}><strong>{label}:</strong> {value}</p>)}
        </article>)}
      </section>
    </>}
  </>);
}
