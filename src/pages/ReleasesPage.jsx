import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import sanityClient from '../sanityClient';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import { SITE_URL } from '../config/siteMetadata';
import generatedReleasesPageData from '../store/data/generatedReleasesPageData.json';

const RELEASES_QUERY = `*[_type == "release"] | order(coalesce(publishedAt, _createdAt) desc)[0...50]{
  _id,
  title,
  "slug": slug.current,
  summary,
  publishedAt,
  body,
  canonicalUrl,
  metaDescription,
  isArchived,
  mediaContact{ name, organization, email, website, location, instagram, tiktok },
  campaignHighlights,
  pressFacts[]{ label, value },
  leadership[]{ name, title, bio },
  pressAssets[]{ label, value, href },
  pressKitUrl,
  storyAngles,
  heroImage{ alt, "url": asset->url }
}`;

const INITIAL_RELEASES = Array.isArray(generatedReleasesPageData?.releases)
  ? generatedReleasesPageData.releases
  : [];

const portableComponents = createPortableTextComponents();
const typewriterFonts = "'IBM Plex Mono', 'Courier Prime', 'Courier New', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'";

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function releaseUrl(release) {
  return release.canonicalUrl || `${SITE_URL}/releases#${release.slug || release._id}`;
}

function hasItems(items) {
  return Array.isArray(items) && items.length > 0;
}

function ContactBlock({ contact, compact = false }) {
  if (!contact) return null;
  return (
    <div className={compact ? 'text-sm text-neutral-700' : 'md:justify-self-end md:text-right text-sm text-neutral-700'}>
      <p className="font-semibold text-neutral-900">Media Contact</p>
      {contact.name && <p>{contact.name}</p>}
      {contact.organization && <p>{contact.organization}</p>}
      {contact.location && compact && <p>{contact.location}</p>}
      {contact.email && (
        <p>
          <a href={`mailto:${contact.email}`} className="underline underline-offset-4 hover:opacity-80">
            {contact.email}
          </a>
        </p>
      )}
      {contact.website && (
        <p>
          <a href={contact.website} className="underline underline-offset-4 hover:opacity-80">
            {contact.website.replace(/^https?:\/\//, '')}
          </a>
        </p>
      )}
    </div>
  );
}

const ReleasesPage = () => {
  const [releases, setReleases] = useState(INITIAL_RELEASES);
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
    return 'Press releases and media resources from Local Effort Cooperative.';
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
        url: releaseUrl(release),
      },
    }));
    if (!list.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Local Effort Releases',
      itemListElement: list,
    };
  }, [releases]);

  const primaryRelease = useMemo(
    () => releases.find((release) => !release.isArchived) || releases[0] || null,
    [releases],
  );

  const archivedReleases = useMemo(
    () => releases.filter((release) => release._id !== primaryRelease?._id),
    [primaryRelease, releases],
  );

  return (
    <div className="bg-neutral-50 py-16">
      <Helmet>
        <title>Releases | Local Effort</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`${SITE_URL}/releases`} />
        <link rel="alternate" type="application/rss+xml" title="Local Effort Releases RSS" href="/api/feeds/releases.rss" />
        <link rel="alternate" type="application/atom+xml" title="Local Effort Releases Atom" href="/api/feeds/releases.atom" />
        {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {!error && releases.length === 0 && (
          <div className="rounded-md border border-neutral-200 bg-white p-4 text-neutral-700">
            No releases have been published yet.
          </div>
        )}

        {primaryRelease && (
          <article
            id={primaryRelease.slug || primaryRelease._id}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl shadow-neutral-900/5"
            style={{ fontFamily: typewriterFonts }}
          >
            <div className="bg-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.4em] text-neutral-100">
              Press Release
            </div>
            <div className="space-y-8 px-6 py-8 md:px-10 md:py-12">
              <header className="space-y-4">
                <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.3em] text-neutral-600">
                  <span>For Immediate Release</span>
                  <span>{formatDate(primaryRelease.publishedAt)}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[2fr,1fr] md:items-start">
                  <div className="space-y-3">
                    <h1 className="heading-xl heading-balance">{primaryRelease.title}</h1>
                    {primaryRelease.summary && (
                      <p className="text-base leading-relaxed text-neutral-700">{primaryRelease.summary}</p>
                    )}
                  </div>
                  <ContactBlock contact={primaryRelease.mediaContact} />
                </div>
              </header>

              {primaryRelease.heroImage?.url && (
                <img
                  src={primaryRelease.heroImage.url}
                  alt={primaryRelease.heroImage?.alt || ''}
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              )}

              {hasItems(primaryRelease.body) && (
                <div className="prose max-w-none text-[1.02rem] leading-relaxed text-neutral-800">
                  <PortableText value={primaryRelease.body} components={portableComponents} />
                </div>
              )}

              {hasItems(primaryRelease.campaignHighlights) && (
                <section aria-labelledby="campaign-highlights" className="space-y-3">
                  <h2 id="campaign-highlights" className="heading-overline text-neutral-600">
                    Campaign Snapshot
                  </h2>
                  <ul className="space-y-3 text-neutral-800">
                    {primaryRelease.campaignHighlights.map((item) => (
                      <li key={item} className="relative pl-5">
                        <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <footer className="border-t border-dashed border-neutral-300 pt-6">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-600">About Local Effort</p>
                <p className="mt-3 text-[1.02rem] leading-relaxed text-neutral-800">
                  Local Effort Cooperative is a Roseville-based personal chef and catering team specializing in locally sourced cuisine. Since 2022, the team has designed in-home dinners, weekly meal prep, and small events that keep Midwestern ingredients at the center of every menu.
                </p>
              </footer>
            </div>
          </article>
        )}

        {primaryRelease && (
          <section className="mt-16 space-y-8">
            <div className="space-y-3">
              <h2 className="heading-xl heading-balance">Press Kit</h2>
              <p className="max-w-3xl text-neutral-600">
                {/* Was hardcoded to the 1,000-pizza campaign, which stopped
                    being the featured release the moment a newer one shipped. */}
                Download-ready facts, leadership bios, and campaign details to support coverage of
                {primaryRelease.title ? ` “${primaryRelease.title}.”` : ' Local Effort Cooperative.'}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {hasItems(primaryRelease.pressFacts) && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-neutral-900">Fast Facts</h3>
                  <dl className="mt-4 space-y-3 text-neutral-700">
                    {primaryRelease.pressFacts.map(({ label, value }) => (
                      <div key={label} className="flex flex-col">
                        <dt className="text-xs uppercase tracking-[0.25em] text-neutral-500">{label}</dt>
                        <dd className="text-base">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {hasItems(primaryRelease.leadership) && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-neutral-900">Leadership</h3>
                  <ul className="mt-4 space-y-4 text-neutral-700">
                    {primaryRelease.leadership.map(({ name, title, bio }) => (
                      <li key={name}>
                        <p className="text-base font-semibold text-neutral-900">{name}</p>
                        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">{title}</p>
                        <p className="mt-2 text-sm leading-relaxed">{bio}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(hasItems(primaryRelease.pressAssets) || primaryRelease.pressKitUrl) && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <h3 className="text-lg font-semibold text-neutral-900">Campaign Assets</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(primaryRelease.pressAssets || []).map(({ label, value, href }) => (
                      <a
                        key={label}
                        href={href}
                        className="group flex flex-col justify-between rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow"
                      >
                        <span className="text-xs uppercase tracking-[0.25em] text-neutral-500">{label}</span>
                        <span className="mt-2 text-base text-neutral-900 group-hover:underline group-hover:underline-offset-4">
                          {value}
                        </span>
                      </a>
                    ))}
                    {primaryRelease.pressKitUrl && (
                      <a
                        href={primaryRelease.pressKitUrl}
                        className="group flex flex-col justify-between rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow"
                      >
                        <span className="text-xs uppercase tracking-[0.25em] text-neutral-500">Press Kit PDF</span>
                        <span className="mt-2 text-base text-neutral-900 group-hover:underline group-hover:underline-offset-4">
                          Download press kit (PDF)
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {primaryRelease.mediaContact && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-neutral-900">Media Contact</h3>
                  <div className="mt-3">
                    <ContactBlock contact={primaryRelease.mediaContact} compact />
                  </div>
                  {primaryRelease.mediaContact.instagram && (
                    <p className="mt-4 text-sm text-neutral-700">
                      Instagram:{' '}
                      <a href={primaryRelease.mediaContact.instagram} className="underline underline-offset-4 hover:opacity-80">
                        @localeffortfood
                      </a>
                    </p>
                  )}
                  {primaryRelease.mediaContact.tiktok && (
                    <p className="mt-1 text-sm text-neutral-700">
                      TikTok:{' '}
                      <a href={primaryRelease.mediaContact.tiktok} className="underline underline-offset-4 hover:opacity-80">
                        @localeffort
                      </a>
                    </p>
                  )}
                </div>
              )}

              {hasItems(primaryRelease.storyAngles) && (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-neutral-900">Story Angles</h3>
                  <ul className="mt-4 space-y-3 text-neutral-700">
                    {primaryRelease.storyAngles.map((angle) => (
                      <li key={angle} className="relative pl-4">
                        <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                        {angle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {hasItems(archivedReleases) && (
          <section className="mt-24" aria-labelledby="archive-heading">
            <h2 id="archive-heading" className="heading-lg heading-balance mb-6">Previous Releases</h2>
            <div className="space-y-4">
              {archivedReleases.map((release) => (
                <details key={release._id} className="group rounded-lg border border-neutral-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4">
                    <span className="font-medium text-neutral-800">{release.title}</span>
                    <span className="text-xs text-neutral-500 group-open:hidden">Expand</span>
                    <span className="hidden text-xs text-neutral-500 group-open:inline">Collapse</span>
                  </summary>
                  <div className="space-y-5 px-6 pb-8 text-[0.97rem] leading-relaxed text-neutral-800">
                    {release.summary && <p>{release.summary}</p>}
                    {hasItems(release.body) && (
                      <div className="prose max-w-none">
                        <PortableText value={release.body} components={portableComponents} />
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ReleasesPage;
