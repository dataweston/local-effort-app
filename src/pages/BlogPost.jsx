import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import { motion } from 'framer-motion';

import { portableTextComponents } from '../utils/portableTextComponents';
import { SITE_URL } from '../config/siteMetadata';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return '';
  }
};

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
      } catch (requestError) {
        if (mounted) {
          setStatusCode(500);
          setError(requestError?.message || 'Failed to load post');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const canonicalUrl = post?.canonicalUrl || `${SITE_URL}/blog/${slug}`;
  const pageTitle = post?.metaTitle || (post?.title ? `${post.title} | Local Report | Local Effort` : 'Local Report | Local Effort');
  const description = post?.metaDescription || post?.excerpt || '';
  const ogImage = post?.ogImageUrl || '';

  if (error && statusCode === 404) {
    return (
      <div className="blog-page fullpage-demo-scope">
        <div className="blog-page-shell">
          <div className="blog-page-error">Post not found.</div>
        </div>
      </div>
    );
  }

  if (error && statusCode === 403) {
    return (
      <div className="blog-page fullpage-demo-scope">
        <div className="blog-page-shell">
          <div className="blog-page-error">This post is for members only.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-page fullpage-demo-scope">
        <div className="blog-page-shell">
          <div className="blog-page-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-page fullpage-demo-scope">
        <div className="blog-page-shell">
          <div className="blog-page-loading">Loading Local Report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page fullpage-demo-scope">
      <Helmet>
        <title>{pageTitle}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post?.metaTitle || post?.title || 'Local Report'} />
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

      <div className="blog-page-shell">
        <motion.div
          className="blog-page-detail-grid"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <aside>
            <div className="blog-page-meta-card">
              <Link to="/blog" className="blog-page-back-link">
                <span aria-hidden="true">&larr;</span>
                <span>Back to Local Report</span>
              </Link>

              <div className="blog-page-meta-list">
                <div>
                  <p className="blog-page-meta-label">Section</p>
                  <p className="blog-page-meta-copy">{post.category || 'General report'}</p>
                </div>
                <div>
                  <p className="blog-page-meta-label">Published</p>
                  <p className="blog-page-meta-copy">{formatDate(post.publishedAt) || 'Unscheduled'}</p>
                </div>
                <div>
                  <p className="blog-page-meta-label">Reading time</p>
                  <p className="blog-page-meta-copy">{post.readingTimeMinutes || 1} min read</p>
                </div>
                {(post.authors || []).length > 0 && (
                  <div>
                    <p className="blog-page-meta-label">Byline</p>
                    <p className="blog-page-meta-copy">{post.authors.map((author) => author.name).join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <article className="blog-page-post">
            <header className="blog-page-post-header">
              <p className="blog-page-kicker">Local Report</p>
              <div className="blog-page-post-meta">
                {post.category && <span className="blog-page-chip is-accent">{post.category}</span>}
                {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
              </div>
              <h1 className="blog-page-post-title">{post.title}</h1>
              {post.excerpt && <p className="blog-page-post-excerpt">{post.excerpt}</p>}
              {(post.tags || []).length > 0 && (
                <div className="blog-page-tag-row" aria-label="Post tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="blog-page-chip">{tag}</span>
                  ))}
                </div>
              )}
            </header>

            {(post.mainImageUrl || post.ogImageUrl) && (
              <div className="blog-page-image-frame">
                <img
                  src={post.mainImageUrl || post.ogImageUrl}
                  alt={post.mainImageAlt || post.ogImageAlt || post.title || 'Blog post image'}
                  loading="lazy"
                />
              </div>
            )}

            <div className="blog-page-richtext">
              {Array.isArray(post.body) && post.body.length > 0
                ? <PortableText value={post.body} components={portableTextComponents} />
                : <div dangerouslySetInnerHTML={{ __html: post?.html || '' }} />}
            </div>
          </article>
        </motion.div>
      </div>
    </div>
  );
};

export default BlogPost;
