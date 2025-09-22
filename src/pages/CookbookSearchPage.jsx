import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function getAuthors(result) {
  if (Array.isArray(result.creators) && result.creators.length) return result.creators.join(', ');
  if (Array.isArray(result.creator) && result.creator.length) return result.creator.join(', ');
  if (typeof result.creator === 'string') return result.creator;
  if (Array.isArray(result.authors) && result.authors.length) return result.authors.join(', ');
  if (typeof result.author === 'string') return result.author;
  return null;
}

function pickHighlight(result) {
  const highlight = result.highlight || {};
  const fields = ['instructions', 'ingredients', 'description', 'text', 'content'];
  for (const field of fields) {
    const value = highlight[field];
    if (Array.isArray(value) && value.length) {
      return value.join(' … ');
    }
  }
  return null;
}

export default function CookbookSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const apiBase = useMemo(() => {
    const env = (import.meta && import.meta.env) ? import.meta.env : {};
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return env.VITE_COOKBOOK_API_URL || env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  }, []);

  const debouncedQ = useDebouncedValue(q, 350);

  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (q !== current) {
      const next = new URLSearchParams(searchParams);
      if (q) next.set('q', q);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }
  }, [q, searchParams, setSearchParams]);

  useEffect(() => {
    let abort = false;
    async function runStats() {
      try {
        const res = await fetch(`${apiBase}/api/stats`, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const json = await res.json();
        if (!abort) setStats(json);
      } catch (e) {
        // optional endpoint; ignore failures
      }
    }
    runStats();
    return () => {
      abort = true;
    };
  }, [apiBase]);

  useEffect(() => {
    let abort = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const url = `${apiBase}/api/search?q=${encodeURIComponent(debouncedQ || '')}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        const items = Array.isArray(json.results) ? json.results : [];
        if (!abort) setResults(items);
      } catch (e) {
        if (!abort) {
          setError('Unable to reach the cookbook search API. Ensure the FastAPI service is running.');
          setResults([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [apiBase, debouncedQ]);

  const totalResults = results.length;
  const heroSubtitle = debouncedQ
    ? `Showing ${loading ? 'matching' : totalResults ? `${totalResults} matching` : 'no matching'} recipes for "${debouncedQ}".`
    : 'Browse the Midwestern community cookbook archive by ingredient, title, community group, or contributor.';

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <header className="space-y-4 pb-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Cookbook Archive</p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Find recipes from community cookbooks</h1>
          <p className="text-base text-gray-600">{heroSubtitle}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Indexed titles</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats?.documents ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Parsed recipes</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats?.recipes ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Sources indexed</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats?.sources ?? 'Library, DPLA, MSU'}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form
          className="flex flex-col gap-4 md:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, community group, ingredient, or keyword"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error ? (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading && totalResults === 0 ? (
            <p className="text-sm text-gray-500">Loading results…</p>
          ) : totalResults === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Try searching for an ingredient ("cardamom"), a community group ("church ladies"), or a location ("Milwaukee").
            </div>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => {
                const authors = getAuthors(r);
                const snippet = pickHighlight(r) || (Array.isArray(r.ingredients) && r.ingredients.length ? r.ingredients.slice(0, 3).join(' • ') : null);
                const institution = r.institution || r.community || r.source;
                return (
                  <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <Link to={`/recipes/${encodeURIComponent(r.id)}`} className="block space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{r.title || r.id}</h3>
                          {authors ? <p className="text-sm text-gray-600">{authors}</p> : null}
                        </div>
                        {institution ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {institution}
                          </span>
                        ) : null}
                      </div>
                      {snippet ? (
                        <p className="text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: snippet }} />
                      ) : null}
                      {Array.isArray(r.matched_terms) && r.matched_terms.length ? (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {r.matched_terms.slice(0, 6).map((term, idx) => (
                            <span key={idx} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">Help us expand the archive</h2>
          <p className="text-base text-gray-600">
            We are indexing community cookbooks from Minnesota, Wisconsin, and neighboring states. Have a scan or lead we should include?
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="mailto:cookbooks@localeffort.org"
              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:text-blue-800"
            >
              Share a cookbook
            </a>
            <Link
              to="/recipes/msu_fa_4"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              See an example recipe
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
