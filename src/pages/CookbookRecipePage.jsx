import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n|\u2022|�/).map((x) => x.trim()).filter(Boolean);
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

export default function CookbookRecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = useMemo(() => {
    const env = (import.meta && import.meta.env) ? import.meta.env : {};
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return env.VITE_COOKBOOK_API_URL || env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  }, []);

  useEffect(() => {
    let abort = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/api/recipes/${encodeURIComponent(id)}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!abort) setRecipe(json);
      } catch (e) {
        if (!abort) setError('Recipe details are unavailable. Try refreshing after the API starts.');
      } finally {
        if (!abort) setLoading(false);
      }
    }
    if (id) run();
    return () => {
      abort = true;
    };
  }, [apiBase, id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
  <p className="text-sm text-gray-500">Loading recipe…</p>
      </div>
    );
  }

  if (error) {
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

  const imageUrl = pickImage(recipe);
  const title = recipe.title || recipe.display_title || id;
  const description =
    recipe.description ||
    (Array.isArray(recipe.descriptions) ? recipe.descriptions.filter(Boolean).join('\n\n') : '') ||
    '';
  const ingredients = toList(recipe.ingredients);
  const instructions = toList(recipe.instructions);
  const subjects = toList(recipe.subjects || recipe.subject);
  const creators = toList(recipe.creators || recipe.creator || recipe.authors || recipe.author);
  const publisher = recipe.publisher || recipe.metadata?.publisher || '';
  const date = recipe.year || recipe.date || recipe.metadata?.date || '';
  const locationInfo = recipe.location;
  const locations = Array.isArray(locationInfo) ? locationInfo : toList(locationInfo?.places || locationInfo?.state || locationInfo?.city || locationInfo?.county);
  const extUrl =
    recipe.digital_url ||
    recipe.url ||
    recipe.external_url ||
    recipe.identifier_access ||
    recipe['identifier-access'] ||
    (recipe.links && (recipe.links.source || recipe.links.catalog)) ||
    null;
  const iiifManifest = recipe.iiif_manifest || recipe.iiifManifest || recipe.iiif?.manifest || null;

  const instructionsPresent = instructions.length > 0;
  const ingredientsPresent = ingredients.length > 0;

  const fallbackMessage = !instructionsPresent && !ingredientsPresent;

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Link to="/cookbook" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
          ? Back to search
        </Link>

        <header className="mt-6 space-y-5">
          {imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <img src={imageUrl} alt={title} className="h-64 w-full object-cover" loading="lazy" />
            </div>
          ) : null}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Historic cookbook</p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{title}</h1>
            {description ? <p className="text-base leading-relaxed text-gray-700">{description}</p> : null}
            <div className="flex flex-wrap gap-2">
              {creators.slice(0, 3).map((creator, idx) => (
                <span key={idx} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {creator}
                </span>
              ))}
              {locations.slice(0, 2).map((loc, idx) => (
                <span key={`loc-${idx}`} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
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
                  {ingredients.map((item, idx) => (
                    <li key={idx}>{item}</li>
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
