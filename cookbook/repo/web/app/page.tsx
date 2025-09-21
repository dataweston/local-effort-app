import Link from 'next/link';
import type { CSSProperties } from 'react';

const sectionStyle: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '3rem 1.5rem',
  fontFamily: '"Inter", system-ui, sans-serif',
};

export default function HomePage() {
  return (
    <main style={{ background: '#fdf9f3', minHeight: '100vh' }}>
      <section
        style={{
          ...sectionStyle,
          textAlign: 'center',
          paddingTop: '5rem',
          paddingBottom: '4rem',
        }}
      >
        <p style={{ letterSpacing: 2, textTransform: 'uppercase', color: '#8c6239', fontWeight: 600 }}>
          Curated Midwest Community Cookbooks
        </p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', margin: '1rem 0', color: '#2c1810' }}>
          Discover church, school, and neighborhood recipes from Minnesota and Wisconsin
        </h1>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#4a3326', margin: '0 auto', maxWidth: 640 }}>
          Every title in the collection is digitized, scored for Midwest provenance, and enriched with structured metadata
          ready for historians, search engines, and language models.
        </p>
        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/search"
            style={{
              background: '#8c6239',
              color: '#fff',
              padding: '0.9rem 2.4rem',
              borderRadius: 999,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Browse the cookbook index
          </Link>
          <a
            href="https://github.com/dataweston/local-effort-app"
            style={{
              border: '2px solid #8c6239',
              color: '#8c6239',
              padding: '0.85rem 2.2rem',
              borderRadius: 999,
              fontWeight: 600,
              textDecoration: 'none',
              background: '#fff',
            }}
          >
            Contribute sources
          </a>
        </div>
      </section>

      <section style={{ ...sectionStyle, background: '#fff', borderRadius: '24px 24px 0 0' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#2c1810' }}>Why this catalog is different</h2>
        <div
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {[
            {
              title: 'Midwest-first curation',
              body: 'Allow and deny lists tuned for Minnesota and Wisconsin institutions keep the collection focused on true community cookbooks.',
            },
            {
              title: 'Digitized and review-ready',
              body: 'Scoring filters require PDF or IIIF manifests, so every accepted record has scans available for reference.',
            },
            {
              title: 'LLM-friendly schema',
              body: 'Recipes, locations, and curator notes are normalized for downstream AI enrichment and structured SEO.',
            },
            {
              title: 'Self-hosted metadata',
              body: 'Harvesters persist JSON locally—no external embeds—allowing you to audit and remix the dataset offline.',
            },
          ].map((card) => (
            <article key={card.title} style={{ background: '#f8efe4', padding: '1.75rem', borderRadius: 18 }}>
              <h3 style={{ color: '#2c1810', fontSize: '1.2rem', marginBottom: '0.75rem' }}>{card.title}</h3>
              <p style={{ color: '#4a3326', lineHeight: 1.6 }}>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...sectionStyle, paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2c1810' }}>Get started</h2>
        <ol style={{ color: '#4a3326', lineHeight: 1.8, fontSize: '1rem' }}>
          <li>Run the harvesters for Internet Archive, DPLA, and Minnesota/Wisconsin partners.</li>
          <li>Review scored output and curator notes to approve new titles.</li>
          <li>Index recipes for instant search or export JSONL for offline exploration.</li>
        </ol>
      </section>
    </main>
  );
}
