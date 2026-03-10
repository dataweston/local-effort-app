import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_URL } from '../config/siteMetadata';

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch('/api/v1/posts?limit=50');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || 'Failed to load blog posts');
        }
        if (mounted) setPosts(Array.isArray(payload?.posts) ? payload.posts : []);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load blog posts');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>Blog | Local Effort</title>
        <meta name="description" content="News, stories, and updates from Local Effort Food Co." />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <link rel="alternate" type="application/rss+xml" title="Local Effort Blog RSS" href="/api/feeds/blog.rss" />
        <link rel="alternate" type="application/atom+xml" title="Local Effort Blog Atom" href="/api/feeds/blog.atom" />
        <link rel="alternate" type="application/feed+json" title="Local Effort Blog JSON Feed" href="/api/feeds/blog.json" />
        <link rel="alternate" type="application/activity+json" title="Local Effort ActivityPub Actor" href="/api/activitypub/actor" />
      </Helmet>
      <h1 className="heading-xl heading-balance mb-6">Blog</h1>
      {error && <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded mb-4">{error}</div>}
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="border rounded-lg p-4 hover:bg-gray-50">
            {(p.mainImageUrl || p.ogImageUrl) && (
              <img
                src={p.mainImageUrl || p.ogImageUrl}
                alt={p.mainImageAlt || p.ogImageAlt || p.title || 'Blog post image'}
                loading="lazy"
                className="mb-3 h-52 w-full rounded-md object-cover"
              />
            )}
            <Link to={`/blog/${p.slug}`} className="text-xl font-semibold hover:underline">{p.title}</Link>
            <div className="text-sm text-gray-500 mt-1">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}</div>
            {p.excerpt && <p className="text-gray-700 mt-2">{p.excerpt}</p>}
          </li>
        ))}
        {!posts.length && !error && !loading && <li>No posts yet.</li>}
        {loading && !error && <li>Loading...</li>}
      </ul>
    </div>
  );
};

export default BlogList;
