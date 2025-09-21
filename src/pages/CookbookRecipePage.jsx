import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function CookbookRecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = useMemo(() => {
    const env = (import.meta && import.meta.env) ? import.meta.env : {};
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
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
        const res = await fetch(`${apiBase}/api/recipes/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!abort) setRecipe(json);
      } catch (e) {
        if (!abort) setError('Recipe API unavailable or not found.');
      } finally {
        if (!abort) setLoading(false);
      }
    }
    if (id) run();
    return () => {
      abort = true;
    };
  }, [apiBase, id]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</div>;
  if (!recipe) return <div className="mx-auto max-w-3xl px-4 py-10">Not found.</div>;

  const extUrl =
    recipe.url ||
    recipe.external_url ||
    recipe.identifier_access ||
    recipe['identifier-access'] ||
    recipe.source_url ||
    null;

  const description =
    recipe.description ||
    (Array.isArray(recipe.descriptions) ? recipe.descriptions.filter(Boolean).join(' ') : '') ||
    '';

  const subjects =
    (Array.isArray(recipe.subjects) && recipe.subjects) ||
    (typeof recipe.subject === 'string' ? recipe.subject.split(/[,;]\s*/).filter(Boolean) : []) ||
    [];

  const creators =
    (Array.isArray(recipe.creators) && recipe.creators) ||
    (typeof recipe.creator === 'string' ? [recipe.creator] : []) ||
    [];

  const publisher = recipe.publisher || '';
  const date = recipe.date || recipe.created || recipe['dct:created'] || '';
  const language = recipe.language || recipe['dc:language'] || '';

  const files = Array.isArray(recipe.files)
    ? recipe.files.filter((f) => typeof f?.name === 'string')
    : [];

  const pdfFiles = files.filter((f) => /\.pdf$/i.test(f.name));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{recipe.title || id}</h1>

      {extUrl ? (
        <p className="mt-2 text-sm text-blue-700">
          <a href={extUrl} target="_blank" rel="noopener noreferrer" className="underline">
            View at source
          </a>
        </p>
      ) : null}

      {description ? (
        <section className="mt-6">
          <h2 className="text-xl font-medium">Description</h2>
          <p className="mt-2 text-gray-800 whitespace-pre-wrap">{description}</p>
        </section>
      ) : null}

      {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-xl font-medium">Ingredients</h2>
          <ul className="mt-2 list-disc pl-6">
            {recipe.ingredients.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-xl font-medium">Instructions</h2>
          <div className="mt-2 space-y-3">
            {recipe.instructions.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>
      ) : null}

      {(subjects.length || creators.length || publisher || date || language) ? (
        <section className="mt-6">
          <h2 className="text-xl font-medium">Metadata</h2>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {creators.length ? (
              <div>
                <dt className="text-sm font-medium text-gray-600">Creator</dt>
                <dd className="text-gray-900">{creators.join(', ')}</dd>
              </div>
            ) : null}
            {publisher ? (
              <div>
                <dt className="text-sm font-medium text-gray-600">Publisher</dt>
                <dd className="text-gray-900">{publisher}</dd>
              </div>
            ) : null}
            {date ? (
              <div>
                <dt className="text-sm font-medium text-gray-600">Date</dt>
                <dd className="text-gray-900">{date}</dd>
              </div>
            ) : null}
            {language ? (
              <div>
                <dt className="text-sm font-medium text-gray-600">Language</dt>
                <dd className="text-gray-900">{language}</dd>
              </div>
            ) : null}
            {subjects.length ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-600">Subjects</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {subjects.map((s, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {pdfFiles.length ? (
        <section className="mt-6">
          <h2 className="text-xl font-medium">Available Files</h2>
          <ul className="mt-2 list-disc pl-6 text-sm text-gray-800">
            {pdfFiles.map((f, idx) => (
              <li key={idx}>{f.name}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-gray-600">Open the source link above to access files.</p>
        </section>
      ) : null}

      {recipe.iiif_manifest ? (
        <section className="mt-8">
          <h2 className="text-xl font-medium">Images</h2>
          <iframe
            title="IIIF Viewer"
            src={`https://uv-v4.netlify.app/#?manifest=${encodeURIComponent(recipe.iiif_manifest)}`}
            style={{ width: '100%', height: 600, border: 0 }}
          />
        </section>
      ) : null}
    </div>
  );
}
