import React, { useEffect, useState } from 'react';

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/inbox?status=open&limit=25');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setItems(data.items || []);
      } catch (e) {
        if (mounted) setError(e.message);
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
      {error && <p className="text-red-600">{error}</p>}
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
