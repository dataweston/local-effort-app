import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import {
  CONTACT_EMAIL,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
} from '../../config/siteMetadata';
import { cloudinaryConfig, heroPublicId, heroFallbackSrc, heroVersion } from '../../data/cloudinaryContent';

const buildOgImageUrl = () => {
  const cloudName = cloudinaryConfig?.cloudName;
  if (cloudName && heroPublicId) {
    const versionSegment = heroVersion ? `/v${heroVersion}` : '';
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_1200${versionSegment}/${heroPublicId}.jpg`;
  }
  if (heroFallbackSrc) {
    return `${SITE_URL}${heroFallbackSrc}`;
  }
  return `${SITE_URL}/gallery/logo.png`;
};

export const DefaultSeo = () => {
  const location = useLocation();

  const canonicalUrl = useMemo(() => {
    const path = location.pathname || '/';
    const search = location.search || '';
    const normalized = path === '/' ? '/' : path;
    try {
      const url = new URL(SITE_URL);
      url.pathname = normalized;
      url.search = search;
      if (normalized !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
      }
      return url.toString();
    } catch (err) {
      return `${SITE_URL}${normalized}${search}`;
    }
  }, [location.pathname, location.search]);

  const ogImageUrl = useMemo(() => buildOgImageUrl(), []);

  const structuredData = useMemo(() => {
    const organizationId = `${SITE_URL}#organization`;
    const websiteId = `${SITE_URL}#website`;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        email: CONTACT_EMAIL,
        sameAs: SOCIAL_LINKS,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: CONTACT_EMAIL,
            areaServed: ['US'],
            availableLanguage: ['English'],
          },
        ],
        logo: `${SITE_URL}/gallery/logo.png`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': websiteId,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': organizationId },
        potentialAction: [
          {
            '@type': 'SearchAction',
            target: `${SITE_URL}/api/support/search?q={query}`,
            'query-input': 'required name=query',
          },
          {
            '@type': 'SearchAction',
            target: `${SITE_URL}/api/public/site?q={query}`,
            'query-input': 'optional name=query',
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: SITE_NAME,
        isPartOf: { '@id': websiteId },
        inLanguage: 'en-US',
        description: DEFAULT_DESCRIPTION,
      },
    ];
  }, [canonicalUrl]);

  return (
    <Helmet>
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      <meta name="keywords" content={DEFAULT_KEYWORDS.join(', ')} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={SITE_NAME} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:see_also" content={`${SITE_URL}/ai/manifest.json`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={SITE_NAME} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:site" content="@localeffortfood" />
      <meta
        name="robots"
        content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
      />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" type="text/plain" href={`${SITE_URL}/ai.txt`} />
      <link rel="alternate" type="application/json" href={`${SITE_URL}/ai/manifest.json`} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export default DefaultSeo;
