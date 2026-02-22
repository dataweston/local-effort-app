import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import sanityClient from '../sanityClient';
import { createPortableTextComponents } from '../utils/portableTextComponents';

const RELEASES_QUERY = '*[_type == "release"] | order(coalesce(publishedAt, _createdAt) desc)[0...50]{ _id, title, "slug": slug.current, summary, publishedAt, body, canonicalUrl, metaDescription, heroImage{ alt, "url": asset->url } }';

const portableComponents = createPortableTextComponents({
  types: {
    image: ({ value }) => {
      const src = value?.asset?.url || '';
      if (!src) return null;
      return <img src={src} alt={value?.alt || ''} className="my-4 rounded-lg" loading="lazy" />;
    },
  },
});

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const ReleasesPage = () => {
  const [releases, setReleases] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await sanityClient.fetch(RELEASES_QUERY);
        if (mounted) setReleases(Array.isArray(items) ? items : []);
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load releases');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const pageDescription = useMemo(() => {
    if (releases[0]?.metaDescription) return releases[0].metaDescription;
    return 'Press releases and media resources from Local Effort Food Co.';
  }, [releases]);

  const schema = useMemo(() => {
    const list = releases.map((release, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'NewsArticle',
        headline: release.title,
        datePublished: release.publishedAt,
        description: release.summary,
        url: release.canonicalUrl || `https://localeffortfood.com/releases#${release.slug || release._id}`,
      },
    }));
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Local Effort Releases',
      itemListElement: list,
    };
  }, [releases]);

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>Releases | Local Effort</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href="https://localeffortfood.com/releases" />
        <link rel="alternate" type="application/rss+xml" title="Local Effort Releases RSS" href="/api/feeds/releases.rss" />
        <link rel="alternate" type="application/atom+xml" title="Local Effort Releases Atom" href="/api/feeds/releases.atom" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <header className="mb-8">
        <h1 className="heading-xl heading-balance">Press Releases</h1>
        <p className="text-neutral-600 mt-2">Company announcements and media updates from Local Effort Food Co.</p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700 mb-6">
          {error}
        </div>
      )}

      {!error && releases.length === 0 && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
          No releases have been published yet.
        </div>
      )}

      <div className="space-y-10">
        {releases.map((release) => (
          <article key={release._id} id={release.slug || release._id} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">{formatDate(release.publishedAt)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{release.title}</h2>
            {release.summary && <p className="mt-3 text-neutral-700">{release.summary}</p>}
            {release.heroImage?.url && (
              <img
                src={release.heroImage.url}
                alt={release.heroImage?.alt || ''}
                className="mt-5 rounded-lg"
                loading="lazy"
              />
            )}
            {Array.isArray(release.body) && release.body.length > 0 && (
              <div className="prose max-w-none mt-6">
                <PortableText value={release.body} components={portableComponents} />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReleasesPage;
