import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { API_BASE } from '../lib/apiBase';

const STOCK_PRODUCT_CLASS = 'food_ops.vendor_item.stock_product.v1';
const CLASS_LABELS = {
  'brain.gmail.disposition.sender_thread_class.v1': 'Email classification',
  'brain.partner.vendor_identity.v1': 'Partner identity',
  'food_ops.pack_size.mass.ingredient_family.v1': 'Pack size',
  'food_ops.receipt_scope.vendor_item.v1': 'Receipt scope',
  [STOCK_PRODUCT_CLASS]: 'Vendor catalog mapping',
};
const STATES = [
  { value: 'needs_decision', label: 'Needs a decision' },
  { value: 'applied_shadow', label: 'Applied / shadow' },
  { value: 'history', label: 'History' },
];

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

const centsLabel = (cents) => `$${(cents / 100).toFixed(2)}`;
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `owner-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function answerFor(review, value, gramsPerPack, packText) {
  switch (review.classKey) {
    case STOCK_PRODUCT_CLASS:
      return value === 'ignore'
        ? { outcome: 'ignore', productId: null }
        : { outcome: 'select', productId: value, ...(packText.trim() ? { packText: packText.trim() } : {}) };
    case 'brain.gmail.disposition.sender_thread_class.v1':
      return { disposition: value };
    case 'brain.partner.vendor_identity.v1':
      return value === 'no_match' ? { outcome: 'no_match', vendorId: null } : { outcome: 'match', vendorId: value };
    case 'food_ops.pack_size.mass.ingredient_family.v1':
      return { ingredientFamily: value, gramsPerPack: Number(gramsPerPack) };
    case 'food_ops.receipt_scope.vendor_item.v1':
      return { scope: value };
    default:
      return null;
  }
}

function choicesFor(review, stockProducts) {
  const candidates = review.candidateSet?.candidates || [];
  switch (review.classKey) {
    case STOCK_PRODUCT_CLASS:
      return stockProducts.map((product) => ({ value: product.id, label: `${product.name} (${product.key})` }));
    case 'brain.gmail.disposition.sender_thread_class.v1':
      return ['business', 'personal', 'transactional', 'other'].map((value) => ({ value, label: value }));
    case 'brain.partner.vendor_identity.v1':
      return [...candidates.map((candidate) => ({ value: candidate.vendorId, label: candidate.vendorId })), { value: 'no_match', label: 'No match' }];
    case 'food_ops.pack_size.mass.ingredient_family.v1':
      return candidates.map((candidate) => ({ value: candidate.ingredientFamily, label: candidate.ingredientFamily }));
    case 'food_ops.receipt_scope.vendor_item.v1':
      return ['personal', 'business', 'shared', 'unknown'].map((value) => ({ value, label: value }));
    default:
      return [];
    }


}

function ReviewCard({ review, products, busy, onAnswer, onSkip }) {
  const options = choicesFor(review, products);
  const [value, setValue] = useState('');
  const [gramsPerPack, setGramsPerPack] = useState('');
  const [packText, setPackText] = useState('');
  const impact = review.members.reduce((sum, member) => sum + (member.valueCents || 0), 0);
  const hasImpact = review.members.some((member) => Number.isInteger(member.valueCents));
  const supplierItem = review.classKey === STOCK_PRODUCT_CLASS;
  const needsPackText = supplierItem && value !== 'ignore' && review.members.some((member) => !member.packText);
  const canAnswer = review.status === 'queued' && (options.some((option) => option.value === value) || (supplierItem && value === 'ignore'))
    && (!needsPackText || Boolean(packText.trim()))
    && (review.classKey !== 'food_ops.pack_size.mass.ingredient_family.v1' || Number(gramsPerPack) > 0);
  const submit = () => {
    const answer = answerFor(review, value, gramsPerPack, packText);
    if (answer) void onAnswer(review, answer);
  };

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{CLASS_LABELS[review.classKey] || review.classKey}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{review.members.length} source item(s)</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">{review.priorityBand}</span>
      </header>

      {supplierItem ? review.members.map((member) => (
        <div key={member.id} className="rounded-md bg-slate-50 p-3 text-sm">
          <p className="font-medium">{member.vendorName || 'Unknown supplier'} · {member.description || member.normalizedDescription || member.subjectId}</p>
          {member.packText ? <p className="mt-1 text-slate-600">Pack: {member.packText}</p> : null}
          <p className="mt-1 break-all text-xs text-slate-500">Source ID: {member.subjectId}</p>
        </div>
      )) : (
        <p className="text-xs text-slate-500">Question type: {review.questionKey}</p>
      )}

      <div className="rounded-md border border-slate-200 p-3 text-sm">
        <p className="font-medium">Impact preview</p>
        <p className="mt-1 text-slate-600">{review.members.length} linked source item(s); {hasImpact ? `recorded value ${centsLabel(impact)}` : 'no source value supplied'}. This is context only, not a write.</p>
      </div>

      {review.status === 'queued' ? (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">
            {supplierItem ? 'Controlled stock product' : 'Owner decision'}
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Choose…</option>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {supplierItem ? <option value="ignore">Leave unmapped / ignore</option> : null}
            </select>
          </label>
          {review.classKey === 'food_ops.pack_size.mass.ingredient_family.v1' ? (
            <label className="block text-xs font-medium text-slate-600">
              Grams per pack
              <input type="number" min="0.001" step="any" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm" value={gramsPerPack} onChange={(event) => setGramsPerPack(event.target.value)} />
            </label>
          ) : null}
          {needsPackText ? (
            <label className="block text-xs font-medium text-slate-600">
              Pack size (for example, 1 lb or 5 kg)
              <input type="text" maxLength={100} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm" value={packText} onChange={(event) => setPackText(event.target.value)} />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" disabled={busy || !canAnswer} onClick={submit}>{supplierItem ? 'Apply mapping' : 'Record decision'}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onSkip(review)}>Skip: insufficient evidence</Button>
          </div>
          {supplierItem ? <p className="text-xs text-slate-500">Confirming writes the selected mapping (or ignore status) to the vendor catalog. It does not change cost observations.</p> : null}
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-2 text-sm text-slate-600">
          <p>Status: {review.status}</p>
          {review.decisions.map((decision) => <p key={decision.id}>Revision {decision.revision}: {JSON.stringify(decision.answer)}</p>)}
        </div>
      )}
    </article>
  );
}

export default function AdminOwnerReviewPage() {
  const { user, isAdmin, accessToken, loading: authLoading, signInWithGoogle, signOut } = useSupabaseAuth();
  const [state, setState] = useState('needs_decision');
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [reviewData, productData] = await Promise.all([
        apiFetch(`/api/admin/reviews?state=${encodeURIComponent(state)}&limit=100`, accessToken),
        apiFetch('/api/food-ops/stock-products', accessToken),
      ]);
      setReviews(reviewData.reviews || []);
      setProducts(productData.stockProducts || []);
    } catch (err) {
      setError(err.message || 'Could not load owner reviews');
    } finally {
      setLoading(false);
    }
  }, [accessToken, state]);

  useEffect(() => {
    if (isAdmin && accessToken) void load();
  }, [accessToken, isAdmin, load]);

  const act = async (work) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      await load();
    } catch (err) {
      setError(err.message || 'Could not save review');
    } finally {
      setBusy(false);
    }
  };

  const recordAnswer = (review, answer) => act(async () => {
    await apiFetch(`/api/admin/reviews/${encodeURIComponent(review.id)}/answer`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ answer, expectedRevision: (review.decisions.at(-1)?.revision || 0) + 1, sourceVersion: review.sourceVersion, idempotencyKey: newIdempotencyKey() }),
    });
    setMessage('Decision recorded. No domain data was changed.');
  });

  const skipReview = (review) => act(async () => {
    await apiFetch(`/api/admin/reviews/${encodeURIComponent(review.id)}/skip`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ reasonCode: 'insufficient_evidence', expectedRevision: (review.decisions.at(-1)?.revision || 0) + 1, idempotencyKey: newIdempotencyKey() }),
    });
    setMessage('Review skipped with an audit record.');
  });

  const queueUnmapped = () => act(async () => {
    const result = await apiFetch('/api/admin/reviews/seed/vendor-items', accessToken, { method: 'POST', body: JSON.stringify({ limit: 100 }) });
    setMessage(`Reviewed ${result.examined} unmapped catalog item(s); created ${result.created} owner review(s). Repeat to queue the next batch.`);
  });

  const shell = (children) => <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900"><div className="mx-auto w-full max-w-2xl space-y-4">{children}</div></div>;
  if (authLoading) return shell(<p className="rounded-lg bg-white p-4">Checking access…</p>);
  if (!user) return shell(<div className="rounded-lg bg-white p-4"><h1 className="font-semibold">Owner review queue</h1><p className="my-2 text-sm text-slate-600">Sign in with an admin account.</p><Button onClick={() => signInWithGoogle(`${window.location.origin}/admin/reviews`)}>Sign in with Google</Button></div>);
  if (!isAdmin) return shell(<div className="rounded-lg bg-white p-4"><p className="font-semibold">Admin access required</p><Button className="mt-3" variant="outline" onClick={signOut}>Sign out</Button></div>);

  return shell(<>
    <header>
      <h1 className="text-xl font-semibold">Owner review queue</h1>
      <p className="text-sm text-slate-600">Decisions are audited. Confirmed vendor mappings update the vendor catalog; other answers only record owner-review decisions. Automatic rules remain disabled.</p>
    </header>
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex-1 text-xs font-medium text-slate-600">Queue state
        <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={state} onChange={(event) => setState(event.target.value)}>
          {STATES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <Button variant="outline" disabled={busy || loading} onClick={() => void load()}>Refresh</Button>
      <Button disabled={busy || loading || state !== 'needs_decision'} onClick={queueUnmapped}>Queue up to 100 unmapped items</Button>
    </div>
    {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}
    {loading ? <p className="text-sm text-slate-500">Loading reviews…</p> : null}
    {!loading && reviews.length === 0 ? <p className="rounded-lg bg-white p-4 text-sm text-slate-600">No owner reviews in this state.</p> : null}
    <div className="space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} products={products} busy={busy} onAnswer={recordAnswer} onSkip={skipReview} />)}</div>
    <div className="flex justify-end pb-6"><Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button></div>
  </>);
}
