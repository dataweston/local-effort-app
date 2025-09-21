'use client';

import Link from 'next/link';
import React from 'react';
import type { CSSProperties } from 'react';

const containerStyle: CSSProperties = {
  background: '#fdf9f3',
  minHeight: '100vh',
  padding: '2.5rem 1.5rem',
  fontFamily: '"Inter", system-ui, sans-serif',
};

const panelStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: '1.5rem',
  boxShadow: '0 12px 32px rgba(44, 24, 16, 0.08)',
};

type FacetBucket = {
  key: string;
  doc_count: number;
};

type SearchResult = {
  id: string;
  title?: string;
  location?: { state?: string; county?: string; city?: string };
  institution?: string;
  curation_notes?: string;
  curation?: { score?: number; has_digital_assets?: boolean; matched_community?: string[] };
  highlight?: { ingredients?: string[]; instructions?: string[] } | null;
};

type Facets = {
  states?: FacetBucket[];
  counties?: FacetBucket[];
  institutions?: FacetBucket[];
};

type Filters = {
  state: string;
  county: string;
  institution: string;
  hasScans: boolean;
};

const defaultFilters: Filters = {
  state: '',
  county: '',
  institution: '',
  hasScans: false,
};

const defaultFacets: Facets = {
  states: [],
  counties: [],
  institutions: [],
};

function FacetGroup({
  title,
  buckets = [],
  selected,
  onSelect,
}: {
  title: string;
  buckets?: FacetBucket[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (!buckets?.length) return null;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: '#6b4b32', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {buckets.map((bucket) => {
          const isActive = bucket.key === selected;
          return (
            <button
              key={bucket.key}
              type="button"
              onClick={() => onSelect(isActive ? '' : bucket.key)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 999,
                border: isActive ? '2px solid #8c6239' : '1px solid #d6c7b6',
                background: isActive ? '#8c6239' : '#fff',
                color: isActive ? '#fff' : '#4a3326',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                gap: '0.35rem',
                alignItems: 'center',
              }}
            >
              <span>{bucket.key}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>({bucket.doc_count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SearchPage(): JSX.Element {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [facets, setFacets] = React.useState<Facets>(defaultFacets);
  const [filters, setFilters] = React.useState<Filters>(defaultFilters);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const api = React.useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', []);
  const initialized = React.useRef(false);

  const performSearch = React.useCallback(
    async (query?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const activeQuery = query ?? q;
        if (activeQuery) params.set('q', activeQuery);
        if (filters.state) params.set('state', filters.state);
        if (filters.county) params.set('county', filters.county);
        if (filters.institution) params.set('institution', filters.institution);
        if (filters.hasScans) params.set('has_scans', 'true');
        params.set('size', '20');
        const res = await fetch(`${api}/api/search?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Search failed (${res.status})`);
        }
        const json = await res.json();
        setResults((json.results || []) as SearchResult[]);
        setFacets({
          states: json.facets?.states || [],
          counties: json.facets?.counties || [],
          institutions: json.facets?.institutions || [],
        });
        setTotal(json.total?.value ?? 0);
      } catch (err: any) {
        setError(err?.message || 'Unable to search right now.');
      } finally {
        setLoading(false);
      }
    },
    [api, filters.county, filters.hasScans, filters.institution, filters.state, q]
  );

  React.useEffect(() => {
    if (initialized.current) {
      performSearch();
    }
  }, [filters, performSearch]);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      performSearch('');
    }
  }, [performSearch]);

  const onSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      performSearch(q);
    },
    [performSearch, q]
  );

  const resetFilters = React.useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return (
    <main style={containerStyle}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <aside style={{ ...panelStyle, flex: '1 1 260px', maxWidth: 320 }}>
          <h2 style={{ marginBottom: '1rem', color: '#2c1810' }}>Refine</h2>
          <FacetGroup
            title="States"
            buckets={facets.states}
            selected={filters.state}
            onSelect={(value) => setFilters((prev) => ({ ...prev, state: value, county: value ? prev.county : '' }))}
          />
          <FacetGroup
            title="Counties"
            buckets={facets.counties}
            selected={filters.county}
            onSelect={(value) => setFilters((prev) => ({ ...prev, county: value }))}
          />
          <FacetGroup
            title="Institutions"
            buckets={facets.institutions}
            selected={filters.institution}
            onSelect={(value) => setFilters((prev) => ({ ...prev, institution: value }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: '#4a3326' }}>
            <input
              type="checkbox"
              checked={filters.hasScans}
              onChange={(e) => setFilters((prev) => ({ ...prev, hasScans: e.target.checked }))}
            />
            Show only digitized cookbooks
          </label>
          <button
            type="button"
            onClick={resetFilters}
            style={{
              marginTop: '1.5rem',
              background: '#f8efe4',
              border: '1px solid #d6c7b6',
              borderRadius: 999,
              padding: '0.5rem 1.5rem',
              cursor: 'pointer',
              color: '#6b4b32',
              fontWeight: 600,
            }}
          >
            Clear filters
          </button>
        </aside>

        <section style={{ flex: '3 1 480px', minWidth: 0 }}>
          <div style={{ ...panelStyle, marginBottom: '1.5rem' }}>
            <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search ingredients, titles, or contributors"
                style={{
                  flex: '1 1 280px',
                  borderRadius: 999,
                  border: '1px solid #d6c7b6',
                  padding: '0.75rem 1.2rem',
                  fontSize: '1rem',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#8c6239',
                  color: '#fff',
                  borderRadius: 999,
                  border: 'none',
                  padding: '0.75rem 1.8rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Search
              </button>
            </form>
            <div style={{ marginTop: '1rem', color: '#6b4b32', fontSize: '0.95rem' }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} curated cookbooks`}
            </div>
            {error ? (
              <p style={{ color: '#c0392b', marginTop: '0.75rem' }}>{error}</p>
            ) : null}
          </div>

          {results.map((result) => {
            const title = result.title || 'Untitled cookbook';
            const locationParts = [result.location?.city, result.location?.county, result.location?.state]
              .filter(Boolean)
              .join(', ');
            const highlightPieces = [
              ...(result.highlight?.ingredients || []),
              ...(result.highlight?.instructions || []),
            ];
            return (
              <article key={result.id} style={{ ...panelStyle, marginBottom: '1.25rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#2c1810' }}>{title}</h3>
                    {locationParts ? (
                      <p style={{ margin: '0.25rem 0', color: '#6b4b32' }}>{locationParts}</p>
                    ) : null}
                    {result.institution ? (
                      <p style={{ margin: 0, color: '#6b4b32' }}>Institution: {result.institution}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/recipes/${result.id}`}
                    style={{
                      alignSelf: 'flex-start',
                      background: '#8c6239',
                      color: '#fff',
                      padding: '0.5rem 1.25rem',
                      borderRadius: 999,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View details
                  </Link>
                </header>
                {result.curation_notes ? (
                  <p style={{ marginTop: '0.75rem', color: '#4a3326' }}>
                    <strong>Curator notes:</strong> {result.curation_notes}
                  </p>
                ) : null}
                {result.curation?.matched_community?.length ? (
                  <p style={{ marginTop: '0.5rem', color: '#4a3326' }}>
                    Community markers: {result.curation.matched_community.join(', ')}
                  </p>
                ) : null}
                {highlightPieces.length ? (
                  <div style={{ marginTop: '0.75rem', background: '#f8efe4', padding: '0.75rem 1rem', borderRadius: 12 }}>
                    <p style={{ margin: 0, color: '#6b4b32', fontWeight: 600 }}>Matched snippets</p>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: '#4a3326' }}>
                      {highlightPieces.map((snippet, index) => (
                        <li key={`${result.id}-hl-${index}`}>{snippet}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!loading && !results.length ? (
            <div style={{ ...panelStyle, textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#6b4b32' }}>No cookbooks matched your search. Try removing a filter or using a broader term.</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
