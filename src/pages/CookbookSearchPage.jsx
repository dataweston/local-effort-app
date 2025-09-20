import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CookbookSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBase = useMemo(() => {
    const env = (import.meta && import.meta.env) ? import.meta.env : {};
    // Prefer same-origin in production
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
    return (
      env.VITE_COOKBOOK_API_URL || env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    );
  }, []);

  const debouncedQ = useDebouncedValue(q, 350);

  useEffect(() => {
    // Keep URL in sync
    const current = searchParams.get('q') || '';
    if (q !== current) {
      const next = new URLSearchParams(searchParams);
      if (q) next.set('q', q); else next.delete('q');
      setSearchParams(next, { replace: true });
    }
  }, [q, searchParams, setSearchParams]);

  useEffect(() => {
    let abort = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const url = `${apiBase}/api/search?q=${encodeURIComponent(debouncedQ)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!abort) setResults(Array.isArray(json.results) ? json.results : []);
      } catch (e) {
        if (!abort) {
          setError('Search API unavailable. Start docker compose or API service.');
          setResults([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    // Only query if there is text; empty query allowed to show recent/all when API supports it
    run();
    return () => {
      abort = true;
    };
  }, [apiBase, debouncedQ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Cookbook Search</h1>
        <p className="text-gray-600 mt-2">
          Search parsed recipes once the index is built. API base: <code>{apiBase}</code>
        </p>
      </div>

      <form
        className="flex gap-3 mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          // immediate fetch happens via effect on q
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, ingredient, instruction…"
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-yellow-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        {loading && results.length === 0 ? (
          <div className="text-gray-500">Loading…</div>
        ) : results.length === 0 ? (
          <div className="text-gray-500">No results yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {results.map((r) => (
              <li key={r.id} className="p-4 hover:bg-gray-50">
                <a href={`/recipes/${r.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{r.title || r.id}</h3>
                    {r.source ? (
                      <span className="text-xs uppercase tracking-wide text-gray-500">{r.source}</span>
                    ) : null}
                  </div>
                  {Array.isArray(r.ingredients) && r.ingredients.length > 0 ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {r.ingredients.slice(0, 3).join(' • ')}
                    </p>
                  ) : null}
                  {r.highlight?.instructions ? (
                    <p
                      className="mt-1 text-sm text-gray-600"
                      dangerouslySetInnerHTML={{ __html: r.highlight.instructions.join(' … ') }}
                    />
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10 text-sm text-gray-500">
        <p>
          Tip: Start services with Docker Compose in <code>cookbook/repo</code> and bulk-index
          documents to enable search.
        </p>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-100 p-3 text-xs">
{`# From cookbook/repo
docker compose up -d
python -m indexing.bulk_index --data ./data --index recipes`}
        </pre>
      </div>
    </div>
  );
}
