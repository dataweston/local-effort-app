import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { SITE_URL } from '../config/siteMetadata';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return '';
  }
};

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') || '';
  const selectedCategoryLabel = categories.find((entry) => entry.slug === selectedCategory)?.category || '';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const postParams = new URLSearchParams({ limit: '50' });
      if (selectedCategory) {
        postParams.set('category', selectedCategory);
      }

      try {
        const [postsResult, categoriesResult] = await Promise.allSettled([
          fetch(`/api/v1/posts?${postParams.toString()}`),
          fetch('/api/v1/categories'),
        ]);

        if (postsResult.status !== 'fulfilled') {
          throw postsResult.reason;
        }

        const postsPayload = await postsResult.value.json().catch(() => ({}));
        if (!postsResult.value.ok || postsPayload?.ok === false) {
          throw new Error(postsPayload?.error || 'Failed to load Local Report');
        }

        if (mounted) {
          setPosts(Array.isArray(postsPayload?.posts) ? postsPayload.posts : []);
          setCategoriesTotal(Number(postsPayload?.count) || 0);
        }

        if (categoriesResult.status === 'fulfilled') {
          const categoriesPayload = await categoriesResult.value.json().catch(() => ({}));
          if (categoriesResult.value.ok && categoriesPayload?.ok !== false && mounted) {
            setCategories(Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : []);
            setCategoriesTotal(Number(categoriesPayload?.totalPosts) || Number(postsPayload?.count) || 0);
          }
        } else if (mounted) {
          setCategories([]);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to load Local Report');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [selectedCategory]);

  const handleCategoryChange = (slug) => {
    const nextParams = new URLSearchParams(searchParams);
    if (slug) {
      nextParams.set('category', slug);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="blog-page fullpage-demo-scope">
      <Helmet>
        <title>Local Report | Local Effort</title>
        <meta name="description" content="Dispatches, stories, and kitchen notes from Local Effort Food Co." />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <link rel="alternate" type="application/rss+xml" title="Local Report RSS" href="/api/feeds/blog.rss" />
        <link rel="alternate" type="application/atom+xml" title="Local Report Atom" href="/api/feeds/blog.atom" />
        <link rel="alternate" type="application/feed+json" title="Local Report JSON Feed" href="/api/feeds/blog.json" />
        <link rel="alternate" type="application/activity+json" title="Local Report ActivityPub Actor" href="/api/activitypub/actor" />
      </Helmet>

      <div className="blog-page-shell">
        <motion.section
          className="blog-page-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <p className="blog-page-kicker">Local Report</p>
          <h1 className="blog-page-headline">The whole story.</h1>
          <p className="blog-page-deck">
            The longer explanations and the stories that connect.
          </p>
        </motion.section>

        <div className="blog-page-layout">
          <aside>
            <div className="blog-page-sidebar-card">
              <p className="blog-page-sidebar-label">Categories</p>

              <div className="blog-page-filter-list" role="tablist" aria-label="Blog categories">
                <button
                  type="button"
                  className={`blog-page-filter-btn ${selectedCategory ? '' : 'is-active'}`}
                  onClick={() => handleCategoryChange('')}
                >
                  <span>All posts</span>
                  <span className="blog-page-filter-count">{categoriesTotal || posts.length}</span>
                </button>

                {categories.map((entry) => (
                  <button
                    key={entry.slug}
                    type="button"
                    className={`blog-page-filter-btn ${selectedCategory === entry.slug ? 'is-active' : ''}`}
                    onClick={() => handleCategoryChange(entry.slug)}
                  >
                    <span>{entry.category}</span>
                    <span className="blog-page-filter-count">{entry.postCount}</span>
                  </button>
                ))}
              </div>

              <p className="blog-page-feed-note">
                Subscribe via <a href="/api/feeds/blog.rss">RSS</a> or <a href="/api/feeds/blog.atom">Atom</a>.
              </p>
            </div>
          </aside>

          <section className="blog-page-main" aria-live="polite">
            {error && <div className="blog-page-error">{error}</div>}
            {loading && !error && <div className="blog-page-loading">Loading Local Report...</div>}
            {!loading && !error && selectedCategoryLabel && (
              <div className="blog-page-note">
                Showing posts in <strong>{selectedCategoryLabel}</strong>.
              </div>
            )}

            <div className="blog-page-cards">
              {posts.map((post, index) => (
                <motion.article
                  key={post.slug}
                  className="blog-page-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3), ease: 'easeOut' }}
                >
                  <div className="blog-page-card-media">
                    {(post.mainImageUrl || post.ogImageUrl) ? (
                      <img
                        src={post.mainImageUrl || post.ogImageUrl}
                        alt={post.mainImageAlt || post.ogImageAlt || post.title || 'Blog post image'}
                        loading="lazy"
                      />
                    ) : null}
                  </div>

                  <div className="blog-page-card-body">
                    <div className="blog-page-card-meta">
                      {post.category && <span className="blog-page-chip is-accent">{post.category}</span>}
                      {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                      {post.readingTimeMinutes ? <span>{post.readingTimeMinutes} min read</span> : null}
                    </div>

                    <h2 className="blog-page-card-title">
                      <Link to={`/blog/${post.slug}`} className="blog-page-title-link">
                        {post.title}
                      </Link>
                    </h2>

                    {post.excerpt && <p className="blog-page-card-excerpt">{post.excerpt}</p>}

                    {(post.tags || []).length > 0 && (
                      <div className="blog-page-tag-row" aria-label="Post tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="blog-page-chip">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>

            {!posts.length && !error && !loading && (
              <div className="blog-page-empty">
                No posts matched this category yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
