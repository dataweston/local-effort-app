import React from 'react';

type Recipe = {
  id?: string;
  title: string;
  ingredients?: string[];
  instructions?: string[];
  iiif_manifest?: string;
  pdf_url?: string;
  location?: { state?: string; county?: string; city?: string };
  institution?: string;
  curation_notes?: string;
  curation?: { score?: number; has_digital_assets?: boolean; matched_community?: string[] };
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

  const locationPieces = [recipe.location?.city, recipe.location?.county, recipe.location?.state]
    .filter(Boolean)
    .join(', ');
  const hasDigital = Boolean(recipe.iiif_manifest || recipe.pdf_url || recipe.curation?.has_digital_assets);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: (recipe.instructions || []).map((t) => ({ '@type': 'HowToStep', text: t })),
    publisher: recipe.institution
      ? {
          '@type': 'Organization',
          name: recipe.institution,
        }
      : undefined,
    contentLocation: locationPieces
      ? {
          '@type': 'Place',
          name: locationPieces,
          address: {
            '@type': 'PostalAddress',
            addressRegion: recipe.location?.state,
            addressLocality: recipe.location?.city,
          },
        }
      : undefined,
    keywords: recipe.curation?.matched_community || [],
    hasDigitalDocument:
      recipe.pdf_url || recipe.iiif_manifest
        ? {
            '@type': 'DigitalDocument',
            name: `${recipe.title} digitized scan`,
            url: recipe.pdf_url || recipe.iiif_manifest,
          }
        : undefined,
  };

  return (
    <main style={{ padding: 24, fontFamily: '"Inter", system-ui, sans-serif', background: '#fdf9f3', minHeight: '100vh' }}>
      <section
        style={{
          maxWidth: 880,
          margin: '0 auto',
          background: '#fff',
          padding: '2.5rem 2rem',
          borderRadius: 24,
          boxShadow: '0 20px 48px rgba(44, 24, 16, 0.08)',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#2c1810' }}>{recipe.title}</h1>
        {locationPieces ? <p style={{ color: '#6b4b32', marginTop: 0 }}>{locationPieces}</p> : null}
        {recipe.institution ? (
          <p style={{ color: '#6b4b32', marginTop: 0 }}>Institution: {recipe.institution}</p>
        ) : null}
        {recipe.curation_notes ? (
          <p style={{ color: '#4a3326', marginTop: '1rem', fontStyle: 'italic' }}>Curator notes: {recipe.curation_notes}</p>
        ) : null}
        {recipe.curation?.score !== undefined ? (
          <p style={{ color: '#4a3326', marginTop: '0.5rem' }}>
            Curation score: {recipe.curation.score} • Digital assets:{' '}
            {recipe.curation.has_digital_assets ? 'Yes' : 'Pending review'}
          </p>
        ) : null}

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

      {hasDigital ? (
        <section>
          <h2>Digitized assets</h2>
          <ul>
            {recipe.pdf_url ? (
              <li>
                <a href={recipe.pdf_url} target="_blank" rel="noreferrer">
                  Download PDF scan
                </a>
              </li>
            ) : null}
            {recipe.iiif_manifest ? (
              <li>
                <a href={recipe.iiif_manifest} target="_blank" rel="noreferrer">
                  IIIF manifest
                </a>
              </li>
            ) : null}
          </ul>
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
      </section>
    </main>
  );
}
