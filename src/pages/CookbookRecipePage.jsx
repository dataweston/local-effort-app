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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{recipe.title || id}</h1>
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
