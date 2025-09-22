import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const HIDDEN_STORAGE_KEY = 'cookbook.hiddenIds';
const MODERATOR_STORAGE_KEY = 'cookbook.moderatorMode';

function readStoredJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read storage key', key, err);
    return fallback;
  }
}

function writeStoredJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn('Failed to persist storage key', key, err);
  }
}

function pickHighlight(result) {
  const highlight = result.highlight || {};
  const fields = ['instructions', 'ingredients', 'description', 'text', 'content'];
  for (const field of fields) {
    const value = highlight[field];
    if (Array.isArray(value) && value.length) {
      return value.join(' ? ');
    }
  }
  return null;
}

function mapStaticResult(item) {
  return {
    id: item.id,
    recipeTitle: item.recipeTitle,
    cookbookTitle: item.cookbookTitle,
    year: item.year,
    source: item.source,
    institution: item.institution,
    state: item.state,
    county: item.county,
    hasDigital: Boolean(item.hasDigital),
    ingredientsCount: item.ingredientsCount || 0,
    instructionsPreview: item.instructionsPreview || [],
    detail: item.detail || {},
    highlight: null,
    matched_terms: [],
  };
}

function normalizeApiResult(item) {
  const detailMetadata = item.metadata || {};
  const detail = {
    ingredients: item.ingredients || [],
    instructions: item.instructions || [],
    description: item.description,
    subjects: item.subjects || item.subject || [],
    creators: item.creators || item.creator || item.authors || item.author || [],
    publisher: item.publisher,
    year: item.year || item.date,
    location: item.location || {},
    institution: item.institution,
    iiif_manifest: item.iiif_manifest || item.iiifManifest || (item.iiif && item.iiif.manifest) || null,
    digital_url: item.digital_url || item.digitalUrl || item.url || null,
    digital_urls: item.digital_urls || item.digitalUrls || [],
    image_preview: item.image_preview || item.preview || null,
    metadata: detailMetadata,
  };
  if (!detail.digital_urls.length && detail.digital_url) {
    detail.digital_urls = [detail.digital_url];
  }
  const location = detail.location || {};
  return {
    id: item.id,
    recipeTitle: item.title || item.display_title || item.id,
    cookbookTitle: item.cookbook_title || detailMetadata.cookbook_title || detailMetadata.source_identifier,
    year: detail.year,
    source: item.source,
    institution: detail.institution,
    state: location.state,
    county: location.county,
    hasDigital: Boolean(detail.iiif_manifest || detail.digital_url || detail.digital_urls.length),
    ingredientsCount: detail.ingredients.length,
    instructionsPreview: detail.instructions.slice(0, 3),
    detail,
    highlight: item.highlight || {},
    matched_terms: item.matched_terms || [],
  };
}

export default function CookbookSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [institutionFilter, setInstitutionFilter] = useState(searchParams.get('institution') || '');
  const [hasDigitalOnly, setHasDigitalOnly] = useState(searchParams.get('digital') === 'true');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [facets, setFacets] = useState({ states: [], institutions: [] });
  const [useStatic, setUseStatic] = useState(false);
  const [staticIndex, setStaticIndex] = useState(null);
  const [staticLoading, setStaticLoading] = useState(false);
  const [hiddenIds, setHiddenIds] = useState(() => readStoredJson(HIDDEN_STORAGE_KEY, []));
  const [moderatorMode, setModeratorMode] = useState(() => Boolean(readStoredJson(MODERATOR_STORAGE_KEY, false)));

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const apiBase = useMemo(() => {
    const env = (import.meta && import.meta.env) ? import.meta.env : {};
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return env.VITE_COOKBOOK_API_URL || env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  }, []);

  const debouncedQ = useDebouncedValue(q, 350);

  useEffect(() => {
    writeStoredJson(HIDDEN_STORAGE_KEY, hiddenIds);
  }, [hiddenIds]);

  useEffect(() => {
    writeStoredJson(MODERATOR_STORAGE_KEY, moderatorMode);
  }, [moderatorMode]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stateFilter) next.set('state', stateFilter);
    if (institutionFilter) next.set('institution', institutionFilter);
    if (hasDigitalOnly) next.set('digital', 'true');
    const nextString = next.toString();
    const currentString = searchParams.toString();
    if (nextString !== currentString) {
      setSearchParams(next, { replace: true });
    }
  }, [q, stateFilter, institutionFilter, hasDigitalOnly, searchParams, setSearchParams]);

  const loadStaticIndex = useCallback(async () => {
    if (staticIndex) return staticIndex;
    if (staticLoading) return null;
    setStaticLoading(true);
    try {
      const res = await fetch('/cookbook/index.json', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStaticIndex(json);
      setFacets({
        states: Array.isArray(json.counts?.states) ? json.counts.states : [],
        institutions: Array.isArray(json.counts?.institutions) ? json.counts.institutions : [],
      });
      if (!stats && json.counts) {
        setStats({
          documents: json.counts.documents ?? json.items?.length ?? 0,
          recipes: json.counts.recipes ?? 0,
          sources: json.counts.sources ?? [],
          states: json.counts.states ?? [],
          institutions: json.counts.institutions ?? [],
        });
      }
      return json;
    } catch (err) {
      console.warn('Static cookbook index failed', err);
      setError('Cookbook snapshot is unavailable right now. Refresh after the sync completes.');
      return null;
    } finally {
      setStaticLoading(false);
    }
  }, [staticIndex, staticLoading, stats]);

  const applyStaticFilters = useCallback(
    (indexData) => {
      if (!indexData || !Array.isArray(indexData.items)) return [];
      const query = (debouncedQ || '').trim().toLowerCase();
      return indexData.items
        .map(mapStaticResult)
        .filter((item) => !hiddenSet.has(item.id))
        .filter((item) => !stateFilter || item.state === stateFilter)
        .filter((item) => !institutionFilter || item.institution === institutionFilter)
        .filter((item) => !hasDigitalOnly || item.hasDigital)
        .filter((item) => {
          if (!query) return true;
          const haystack = [
            item.recipeTitle,
            item.cookbookTitle,
            item.year,
            (item.detail?.ingredients || []).join(' '),
            (item.detail?.instructions || []).join(' '),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });
    },
    [debouncedQ, hiddenSet, stateFilter, institutionFilter, hasDigitalOnly],
  );

  useEffect(() => {
    let abort = false;
    async function runStats() {
      try {
        const res = await fetch(`${apiBase}/api/stats`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!abort) setStats(json);
      } catch (err) {
        const index = await loadStaticIndex();
        if (!abort && index?.counts && !stats) {
          setStats({
            documents: index.counts.documents ?? index.items?.length ?? 0,
            recipes: index.counts.recipes ?? 0,
            sources: index.counts.sources ?? [],
            states: index.counts.states ?? [],
            institutions: index.counts.institutions ?? [],
          });
        }
      }
    }
    runStats();
    return () => {
      abort = true;
    };
  }, [apiBase, loadStaticIndex, stats]);

  useEffect(() => {
    let abort = false;
    async function executeSearch() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (debouncedQ) params.set('q', debouncedQ);
      if (stateFilter) params.set('state', stateFilter);
      if (institutionFilter) params.set('institution', institutionFilter);
      if (hasDigitalOnly) params.set('has_scans', 'true');
      try {
        const res = await fetch(`${apiBase}/api/search?${params.toString()}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (abort) return;
        const items = Array.isArray(json.results) ? json.results : [];
        const normalized = items
          .map(normalizeApiResult)
          .filter((item) => !hiddenSet.has(item.id))
          .filter((item) => (!hasDigitalOnly ? true : item.hasDigital));
        setResults(normalized);
        const facetStates = Array.isArray(json.facets?.states)
          ? json.facets.states.map((entry) => entry.key || entry.term || entry.value || entry)
          : [];
        const facetInstitutions = Array.isArray(json.facets?.institutions)
          ? json.facets.institutions.map((entry) => entry.key || entry.term || entry.value || entry)
          : [];
        setFacets({ states: facetStates, institutions: facetInstitutions });
        if (json.total?.value != null) {
          setStats((prev) => ({ ...(prev || {}), documents: json.total.value }));
        }
        setUseStatic(false);
      } catch (err) {
        if (abort) return;
        console.warn('Cookbook API search failed, using static dataset', err);
        setError('Showing local cookbook snapshot while the live API is unreachable.');
        const index = await loadStaticIndex();
        if (!abort && index) {
          setUseStatic(true);
          setResults(applyStaticFilters(index));
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    executeSearch();
    return () => {
      abort = true;
    };
  }, [apiBase, debouncedQ, stateFilter, institutionFilter, hasDigitalOnly, hiddenSet, loadStaticIndex, applyStaticFilters]);

  useEffect(() => {
    if (useStatic && staticIndex) {
      setResults(applyStaticFilters(staticIndex));
    }
  }, [useStatic, staticIndex, applyStaticFilters]);

  const availableStates = useMemo(() => {
    if (facets.states.length) return facets.states;
    if (staticIndex?.counts?.states) return staticIndex.counts.states;
    return [];
  }, [facets.states, staticIndex]);

  const availableInstitutions = useMemo(() => {
    if (facets.institutions.length) return facets.institutions;
    if (staticIndex?.counts?.institutions) return staticIndex.counts.institutions;
    return [];
  }, [facets.institutions, staticIndex]);

  const handleHide = useCallback(
    (id) => {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [],
  );

  const handleUnhide = useCallback(
    (id) => {
      setHiddenIds((prev) => prev.filter((value) => value !== id));
    },
    [],
  );

  const handleClearHidden = useCallback(() => {
    setHiddenIds([]);
  }, []);

  const handleExportHidden = useCallback(() => {
    const payload = JSON.stringify(hiddenIds, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload).catch(() => {
        console.warn('Unable to copy hidden IDs to clipboard');
      });
    } else if (typeof window !== 'undefined') {
      window.prompt('Copy hidden recipe IDs', payload);
    }
  }, [hiddenIds]);

  const onModeratorContext = useCallback(
    (event, item) => {
      if (!moderatorMode) return;
      event.preventDefault();
      const label = item.recipeTitle || item.cookbookTitle || item.id;
      const confirmHide = window.confirm(`Hide "${label}" from local search results?`);
      if (confirmHide) {
        handleHide(item.id);
      }
    },
    [moderatorMode, handleHide],
  );

  const totalResults = results.length;
  const heroSubtitle = debouncedQ
    ? `Showing ${loading ? 'matching' : totalResults ? `${totalResults} matching` : 'no matching'} recipes for "${debouncedQ}"${useStatic ? ' from the local snapshot' : ''}.`
    : 'Browse the Midwestern community cookbook archive by ingredient, title, community group, or contributor.';

  const documentsCount = stats?.documents ?? (useStatic && staticIndex && staticIndex.items ? staticIndex.items.length : 'N/A');
  const recipesCount = stats?.recipes ?? (useStatic && staticIndex && staticIndex.items ? staticIndex.items.filter((item) => item.detail?.ingredients?.length || item.detail?.instructions?.length).length : 'N/A');
  const sourcesList = stats?.sources || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <header className="space-y-4 pb-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Cookbook Archive</p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Find recipes from community cookbooks</h1>
          <p className="text-base text-gray-600">{heroSubtitle}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Indexed titles</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{typeof documentsCount === 'number' ? documentsCount.toLocaleString() : documentsCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Parsed recipes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{typeof recipesCount === 'number' ? recipesCount.toLocaleString() : recipesCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Sources indexed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{sourcesList.length ? sourcesList.join(', ') : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setModeratorMode((prev) => !prev)}
              className={`rounded-md border px-3 py-2 text-xs font-medium ${moderatorMode ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
            >
              {moderatorMode ? 'Exit moderator mode' : 'Moderator tools'}
            </button>
          </div>
        </div>
        {moderatorMode ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>Moderator mode is enabled. Right-click a search result to hide it locally.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">Hidden IDs: {hiddenIds.length}</span>
              <button
                type="button"
                className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:border-amber-400"
                onClick={handleExportHidden}
              >
                Copy hidden list
              </button>
              <button
                type="button"
                className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover-border-amber-400"
                onClick={handleClearHidden}
              >
                Clear hidden
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row">
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
              {loading ? 'Searching?' : 'Search'}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">State</span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">All states</option>
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Institution</span>
              <select
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">All institutions</option>
                {availableInstitutions.map((institution) => (
                  <option key={institution} value={institution}>
                    {institution}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={hasDigitalOnly}
                onChange={(e) => setHasDigitalOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Only show digitized cookbooks</span>
            </label>
          </div>
        </form>

        {error ? (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading && totalResults === 0 ? (
            <p className="text-sm text-gray-500">Loading results?</p>
          ) : totalResults === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Try searching for an ingredient (?cardamom?), a community group (?church ladies?), or a location (?Milwaukee?).
            </div>
          ) : (
            <ul className="space-y-3">
              {results.map((item) => {
                const creators = Array.isArray(item.detail?.creators) ? item.detail.creators.filter(Boolean) : [];
                const snippet = pickHighlight(item) || (item.instructionsPreview && item.instructionsPreview.length ? item.instructionsPreview.join(' ? ') : null);
                return (
                  <li
                    key={item.id}
                    onContextMenu={(event) => onModeratorContext(event, item)}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <Link to={`/recipes/${encodeURIComponent(item.id)}`} className="text-xl font-semibold text-gray-900 hover:text-blue-700">
                          {item.recipeTitle || item.id}
                        </Link>
                        <p className="text-sm text-gray-600">
                          {[item.cookbookTitle, item.year].filter(Boolean).join(' ? ') || 'Cookbook details pending'}
                        </p>
                        {creators.length ? (
                          <p className="text-xs text-gray-500">By {creators.join(', ')}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {item.institution ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {item.institution}
                          </span>
                        ) : null}
                        {moderatorMode && hiddenSet.has(item.id) ? (
                          <button
                            type="button"
                            onClick={() => handleUnhide(item.id)}
                            className="text-xs font-medium text-amber-600 hover:text-amber-800"
                          >
                            Unhide
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {snippet ? (
                      <p className="mt-3 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: snippet }} />
                    ) : null}
                    {Array.isArray(item.matched_terms) && item.matched_terms.length ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {item.matched_terms.slice(0, 6).map((term) => (
                          <span key={term} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                            {term}
                          </span>
                        ))}
                      </div>
                    ) : null}
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
