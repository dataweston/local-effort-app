import React from 'react';

type Recipe = {
  id?: string;
  title: string;
  ingredients?: string[];
  instructions?: string[];
  iiif_manifest?: string;
};

async function fetchRecipe(id: string): Promise<Recipe | null> {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${api}/api/recipes/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function RecipePage({ id }: { id: string }) {
  const recipe = await fetchRecipe(id);
  if (!recipe) return <div>Not found</div>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: (recipe.instructions || []).map((t) => ({ '@type': 'HowToStep', text: t })),
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>{recipe.title}</h1>
      {recipe.ingredients?.length ? (
        <section>
          <h2>Ingredients</h2>
          <ul>
            {recipe.ingredients.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {recipe.instructions?.length ? (
        <section>
          <h2>Instructions</h2>
          {recipe.instructions.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </section>
      ) : null}

      {recipe.iiif_manifest ? (
        <section>
          <h2>Images</h2>
          <iframe
            title="IIIF Viewer"
            src={`https://uv-v4.netlify.app/#?manifest=${encodeURIComponent(recipe.iiif_manifest)}`}
            style={{ width: '100%', height: 600, border: 0 }}
          />
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
