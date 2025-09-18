import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import sanityClient from '../sanityClient';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body }`;
        const item = await sanityClient.fetch(q, { slug });
        if (mounted) setPost(item || null);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load post');
      }
    })();
    return () => { mounted = false };
  }, [slug]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>{post?.title ? `${post.title} | Blog` : 'Blog'} | Local Effort</title>
      </Helmet>
      <Link to="/blog" className="text-sm underline">← Back to blog</Link>
      <h1 className="text-4xl font-bold mt-2">{post.title}</h1>
      <div className="text-sm text-gray-500 mt-1">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</div>
      <article className="prose max-w-none mt-6">
        <PortableText value={post.body} />
      </article>
    </div>
  );
};

export default BlogPost;
