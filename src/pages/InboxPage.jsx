import React, { useEffect, useState } from 'react';

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/inbox?status=open&limit=25');
        let json = null;
        try { json = await res.clone().json(); } catch (_) { /* ignore */ }
        if (!res.ok) {
          const serverMsg = json && (json.error || json.message || JSON.stringify(json));
          throw new Error(serverMsg ? `HTTP ${res.status}: ${serverMsg}` : `HTTP ${res.status}`);
        }
        if (mounted) setItems((json && json.items) || []);
      } catch (e) {
        if (mounted) {
          setError(e.message || 'Failed to load inbox');
          setDetails(e.stack || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Inbox</h1>
      {loading && <p>Loading…</p>}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded mb-4">
          <p className="text-red-700 font-medium">{error}</p>
          {details && <details className="mt-2 text-xs text-red-600 whitespace-pre-wrap"><summary>Stack</summary>{details}</details>}
          <p className="mt-2 text-xs text-gray-600">Likely causes: Sanity client not configured on backend, missing SANITY_* env vars, or Firestore rules not relevant (this endpoint uses Sanity). Check backend /api/inbox logs.</p>
        </div>
      )}
      <ul className="divide-y">
        {items.map((m) => (
          <li key={m._id} className="py-3">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{m.subject || '(no subject)'} </p>
                <p className="text-sm text-gray-500">{m.fromName || m.fromEmail}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
