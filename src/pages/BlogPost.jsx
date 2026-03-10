import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch(`/api/v1/posts/${encodeURIComponent(slug || '')}?include=full`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          if (mounted) {
            setStatusCode(response.status || 500);
            setError(payload?.error || 'Failed to load post');
          }
          return;
        }
        if (mounted) {
          setPost(payload?.post || null);
          setStatusCode(200);
        }
      } catch (err) {
        if (mounted) {
          setStatusCode(500);
          setError(err?.message || 'Failed to load post');
        }
      }
    })();
    return () => { mounted = false };
  }, [slug]);

  if (error && statusCode === 404) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">Post not found.</div>;
  if (error && statusCode === 403) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">This post is for members only.</div>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-4 py-10">Loading...</div>;

  const canonicalUrl = post?.canonicalUrl || `https://localeffortfood.com/blog/${slug}`;
  const pageTitle = post?.metaTitle || (post?.title ? `${post.title} | Blog | Local Effort` : 'Blog | Local Effort');
  const description = post?.metaDescription || post?.excerpt || '';
  const ogImage = post?.ogImageUrl || '';

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>{pageTitle}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post?.metaTitle || post?.title || 'Blog'} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <link rel="canonical" href={canonicalUrl} />
        {post?.slug && (
          <link
            rel="alternate"
            type="application/activity+json"
            href={`/api/activitypub/objects/${encodeURIComponent(post.slug)}`}
          />
        )}
      </Helmet>
      <Link to="/blog" className="text-sm underline">Back to blog</Link>
      <h1 className="heading-xl heading-balance mt-4">{post.title}</h1>
      <div className="text-sm text-gray-500 mt-1">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</div>
      {(post?.mainImageUrl || post?.ogImageUrl) && (
        <img
          src={post.mainImageUrl || post.ogImageUrl}
          alt={post.mainImageAlt || post.ogImageAlt || post.title || 'Blog post image'}
          loading="lazy"
          className="mt-6 w-full rounded-lg object-cover"
        />
      )}
      <article className="prose max-w-none mt-6">
        {Array.isArray(post.body) && post.body.length > 0
          ? <PortableText value={post.body} components={portableTextComponents} />
          : <div dangerouslySetInnerHTML={{ __html: post?.html || '' }} />}
      </article>
    </div>
  );
};

export default BlogPost;
