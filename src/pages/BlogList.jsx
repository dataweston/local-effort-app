import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import sanityClient from '../sanityClient';

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost"] | order(publishedAt desc)[0...50]{ title, "slug": slug.current, excerpt, publishedAt }`;
        const items = await sanityClient.fetch(q);
        if (mounted) setPosts(items || []);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load blog posts');
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>Blog | Local Effort</title>
      </Helmet>
      <h1 className="text-4xl font-bold mb-6">Blog</h1>
      {error && <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded mb-4">{error}</div>}
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="border rounded-lg p-4 hover:bg-gray-50">
            <Link to={`/blog/${p.slug}`} className="text-xl font-semibold hover:underline">{p.title}</Link>
            <div className="text-sm text-gray-500 mt-1">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}</div>
            {p.excerpt && <p className="text-gray-700 mt-2">{p.excerpt}</p>}
          </li>
        ))}
        {!posts.length && !error && <li>No posts yet.</li>}
      </ul>
    </div>
  );
};

export default BlogList;
