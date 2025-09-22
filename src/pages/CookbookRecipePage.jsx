import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((x) => (typeof x === 'string' ? x.trim() : x));
  if (typeof value === 'string') return value.split(/[\r\n\u2022]+/).map((x) => x.trim()).filter(Boolean);
  return [];
}

function pickImage(recipe) {
  if (recipe.image_preview) return recipe.image_preview;
  if (recipe.preview) return recipe.preview;
  if (recipe.metadata) {
    const meta = recipe.metadata;
    if (Array.isArray(meta.image_url) && meta.image_url.length) return meta.image_url[0];
    if (typeof meta.image_url === 'string') return meta.image_url;
    if (meta.thumbnail) return meta.thumbnail;
  }
  return null;
}


const HIDDEN_STORAGE_KEY = 'cookbook.hiddenIds';
const MODERATOR_STORAGE_KEY = 'cookbook.moderatorMode';

let cookbookIndexCache = null;
let cookbookIndexPromise = null;

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

async function fetchCookbookIndex() {
  if (cookbookIndexCache) return cookbookIndexCache;
  if (!cookbookIndexPromise) {
    cookbookIndexPromise = fetch('/cookbook/index.json', { headers: { Accept: 'application/json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        cookbookIndexCache = json;
        return json;
      })
      .catch((err) => {
        cookbookIndexCache = null;
        throw err;
      })
      .finally(() => {
        cookbookIndexPromise = null;
      });
  }
  return cookbookIndexPromise;
}

function buildStaticRecipe(item) {
  const detail = item.detail || {};
  const location = { ...(detail.location || {}) };
  if (!location.state && item.state) location.state = item.state;
  if (!location.county && item.county) location.county = item.county;
  const digitalUrls = detail.digital_urls || [];
  const primaryDigitalUrl = detail.digital_url || digitalUrls[0] || null;
  return {
    id: item.id,
    title: item.recipeTitle || item.id,
    cookbook_title: item.cookbookTitle,
    source: item.source,
    institution: item.institution,
    year: item.year || detail.year,
    description: detail.description,
    subjects: detail.subjects || [],
    creators: detail.creators || [],
    publisher: detail.publisher,
    location,
    ingredients: detail.ingredients || [],
    instructions: detail.instructions || [],
    iiif_manifest: detail.iiif_manifest,
    digital_url: primaryDigitalUrl,
    digital_urls: digitalUrls,
    image_preview: detail.image_preview,
    metadata: detail.metadata || {},
  };
}


export default function CookbookRecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useStatic, setUseStatic] = useState(false);
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

  useEffect(() => {
    writeStoredJson(HIDDEN_STORAGE_KEY, hiddenIds);
  }, [hiddenIds]);

  useEffect(() => {
    writeStoredJson(MODERATOR_STORAGE_KEY, moderatorMode);
  }, [moderatorMode]);

  useEffect(() => {
    let abort = false;
    async function run() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/api/recipes/${encodeURIComponent(id)}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!abort) {
          const normalized = {
            ...json,
            cookbook_title: json.cookbook_title || json.cookbookTitle || json.metadata?.cookbook_title || json.metadata?.source_identifier,
          };
          setRecipe(normalized);
          setUseStatic(false);
        }
      } catch (apiError) {
        try {
          const index = await fetchCookbookIndex();
          if (abort || !index) throw apiError;
          const match = index.items?.find((entry) => entry.id === id);
          if (!match) throw apiError;
          const doc = buildStaticRecipe(match);
          if (!abort) {
            setRecipe(doc);
            setUseStatic(true);
            setError('');
          }
        } catch (fallbackError) {
          if (!abort) {
            console.warn('Cookbook static fallback failed', fallbackError);
            setRecipe(null);
            setError('Recipe details are unavailable. Try refreshing after the API starts.');
          }
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [apiBase, id]);

  const handleHide = useCallback(() => {
    if (!id) return;
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [id]);

  const handleUnhide = useCallback(() => {
    if (!id) return;
    setHiddenIds((prev) => prev.filter((value) => value !== id));
  }, [id]);

  const isHidden = id ? hiddenSet.has(id) : false;

  const cookbookTitle = recipe?.cookbook_title || recipe?.cookbookTitle || recipe?.metadata?.cookbook_title || null;
  const recipeTitle = recipe?.title || recipe?.recipeTitle || cookbookTitle || id;
  const description =
    recipe?.description ||
    (Array.isArray(recipe?.descriptions) ? recipe.descriptions.filter(Boolean).join('

') : '') ||
    '';
  const ingredients = toList(recipe?.ingredients);
  const instructions = toList(recipe?.instructions);
  const subjects = toList(recipe?.subjects || recipe?.subject);
  const creators = toList(recipe?.creators || recipe?.creator || recipe?.authors || recipe?.author);
  const publisher = recipe?.publisher || recipe?.metadata?.publisher || '';
  const date = recipe?.year || recipe?.date || recipe?.metadata?.date || '';
  const locationInfo = recipe?.location || {};
  const locations = Array.isArray(locationInfo)
    ? locationInfo
    : Array.from(new Set(toList([locationInfo.state, locationInfo.city, locationInfo.county])));
  const digitalUrls = Array.isArray(recipe?.digital_urls) ? recipe.digital_urls : toList(recipe?.digital_urls);
  const digitalUrl = recipe?.digital_url || digitalUrls[0] || recipe?.metadata?.digital_url || null;
  const extUrl = digitalUrl || recipe?.url || recipe?.external_url || recipe?.identifier_access || recipe?.metadata?.url || null;
  const iiifManifest = recipe?.iiif_manifest || recipe?.iiifManifest || recipe?.iiif?.manifest || null;
  const imageUrl = recipe ? pickImage(recipe) : null;

  const instructionsPresent = instructions.length > 0;
  const ingredientsPresent = ingredients.length > 0;
  const fallbackMessage = !instructionsPresent && !ingredientsPresent;

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm text-gray-500">Loading recipe?</p>
      </div>
    );
  }

  if (error && !recipe) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
        <Link to="/cookbook" className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
          ? Back to search
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm text-gray-500">Recipe not found.</p>
        <Link to="/cookbook" className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
          ? Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Link to="/cookbook" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
          ? Back to search
        </Link>

        {isHidden ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setModeratorMode((prev) => !prev)}
            className={`rounded-md border px-3 py-2 text-xs font-medium ${moderatorMode ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
          >
            {moderatorMode ? 'Exit moderator mode' : 'Moderator tools'}
          </button>
        </div>


          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This recipe is hidden in moderator tools.
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:border-amber-400"
                onClick={handleUnhide}
              >
                Unhide for this browser
              </button>
            </div>
          </div>
        ) : null}

        {useStatic ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Serving from the local cookbook snapshot while the live API is offline.
          </div>
        ) : null}

        <header className="mt-6 space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{recipeTitle}</h1>
              {cookbookTitle ? (
                <p className="text-lg font-medium text-gray-700">{cookbookTitle}</p>
              ) : null}
              {date ? <p className="text-sm text-gray-500">Published {date}</p> : null}
              {description ? <p className="text-sm text-gray-600">{description}</p> : null}
            </div>
            <div className="flex flex-col items-end gap-3">
              {imageUrl ? (
                <img src={imageUrl} alt={recipeTitle} className="h-36 w-36 rounded-xl object-cover shadow" />
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {creators.slice(0, 3).map((creator) => (
                  <span key={creator} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {creator}
                  </span>
                ))}
                {locations.slice(0, 2).map((loc) => (
                  <span key={loc} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {loc}
                  </span>
                ))}
                {recipe.institution ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    {recipe.institution}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                {extUrl ? (
                  <a
                    href={extUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    View scanned cookbook
                  </a>
                ) : null}
                {iiifManifest ? (
                  <a
                    href={iiifManifest}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:text-blue-800"
                  >
                    Open IIIF manifest
                  </a>
                ) : null}
                {moderatorMode ? (
                  <button
                    type="button"
                    onClick={isHidden ? handleUnhide : handleHide}
                    className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow-sm transition hover:border-amber-400"
                  >
                    {isHidden ? 'Unhide recipe' : 'Hide recipe'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Recipe</h2>
            {ingredientsPresent ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ingredients</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {ingredients.map((itemValue, idx) => (
                    <li key={idx}>{itemValue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {instructionsPresent ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Instructions</h3>
                <div className="mt-3 space-y-4 text-sm leading-relaxed text-gray-700">
                  {instructions.map((step, idx) => (
                    <p key={idx}>{step}</p>
                  ))}
                </div>
              </div>
            ) : null}
            {fallbackMessage ? (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Parsed ingredients and steps are not available yet. Use the source link above to view the original pages.
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
              <dl className="mt-4 space-y-3 text-sm text-gray-700">
                {creators.length ? (
                  <div>
                    <dt className="font-medium text-gray-500">Creators</dt>
                    <dd className="text-gray-900">{creators.join(', ')}</dd>
                  </div>
                ) : null}
                {cookbookTitle ? (
                  <div>
                    <dt className="font-medium text-gray-500">Cookbook</dt>
                    <dd className="text-gray-900">{cookbookTitle}</dd>
                  </div>
                ) : null}
                {publisher ? (
                  <div>
                    <dt className="font-medium text-gray-500">Publisher</dt>
                    <dd className="text-gray-900">{publisher}</dd>
                  </div>
                ) : null}
                {date ? (
                  <div>
                    <dt className="font-medium text-gray-500">Date</dt>
                    <dd className="text-gray-900">{date}</dd>
                  </div>
                ) : null}
                {subjects.length ? (
                  <div>
                    <dt className="font-medium text-gray-500">Subjects</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {subjects.slice(0, 12).map((subject, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                          {subject}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {iiifManifest ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Page viewer</h2>
                <iframe
                  title="IIIF Viewer"
                  src={`https://uv-v4.netlify.app/#?manifest=${encodeURIComponent(iiifManifest)}`}
                  className="mt-3 h-72 w-full rounded-lg border border-gray-200"
                  allowFullScreen
                />
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  );
}
