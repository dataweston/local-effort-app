'use client';
import React from 'react';

export default function SearchPage() {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const res = await fetch(`${api}/api/search?q=` + encodeURIComponent(q));
    const json = await res.json();
    setResults(json.results || []);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Search Recipes</h1>
      <form onSubmit={doSearch} style={{ marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
        <button type="submit">Search</button>
      </form>
      <ul>
        {results.map((r) => (
          <li key={r.id}>
            <a href={`/recipes/${r.id}`}>{r.title || r.id}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
